import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const docker = new Docker();
const port = process.env.PORT || 3001;

// Update CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-domain.vercel.app', 'http://localhost:3000']
    : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(bodyParser.json());

// Store active containers
const activeContainers = new Map<string, any>();

// Cleanup function to remove old containers
const cleanupContainers = async () => {
  console.log('Running cleanup...');
  const now = Date.now();
  const IDLE_TIMEOUT = 10 * 60 * 1000;

  for (const [id, containerObj] of activeContainers.entries()) {
    const { container, startTime } = containerObj;
    if (now - startTime > IDLE_TIMEOUT) {
      try {
        console.log(`Stopping and removing idle container ${id}`);
        if (container) {
            await (container as Docker.Container).stop({ t: 5 });
            await (container as Docker.Container).remove();
        }
        activeContainers.delete(id);
        console.log(`Cleaned up idle container ${id}`);
      } catch (error) {
        console.error(`Error cleaning up idle container ${id}:`, error);
      }
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupContainers, 5 * 60 * 1000);

// Main /run route
app.post('/run', async (req: Request, res: Response) => {
  console.log('Received /run request');
  const { code, input, containerId: existingContainerId } = req.body;

  let container: Docker.Container | undefined;
  let containerId: string | undefined;
  let stream: any;

  try {
    // Case 2: Using existing container
    if (existingContainerId) {
      console.log(`Handling input for existing container: ${existingContainerId}`);
      const containerObj = activeContainers.get(existingContainerId);

      if (!containerObj?.container || !containerObj?.stream) {
        return res.status(404).json({ error: 'Container not found or stream not available' });
      }

      container = containerObj.container as Docker.Container;
      stream = containerObj.stream;
      containerId = existingContainerId;

      if (input !== undefined) {
        console.log('Writing input to container stream:', input);
        
        const writeStream = await container.attach({
            stream: true,
            stdin: true,
            stdout: false,
            stderr: false,
            hijack: true
        });

        if (writeStream.writable) {
             writeStream.write(input + '\n');

        } else {
            console.error('Container stream is not writable.');
             res.status(500).json({ error: 'Container stream is not writable' });
             return;
        }

       let subsequentOutput = '';
       const subsequentOutputPromise = new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            console.log('Timeout waiting for subsequent output.');
            resolve(subsequentOutput);
          }, 1000);

          const dataHandler = (chunk: Buffer) => {
            subsequentOutput += chunk.toString();
            if (
              subsequentOutput.includes('Enter first number:') ||
              subsequentOutput.includes('Enter second number:') ||
              subsequentOutput.includes('Enter operation') ||
              subsequentOutput.includes('Result:') ||
              subsequentOutput.includes('Error:') ||
              subsequentOutput.includes('finished')
            ) {
              console.log('Detected prompt/result in subsequent output.');
              clearTimeout(timer);
              stream.off('data', dataHandler);
              resolve(subsequentOutput);
            }
          };

          stream.on('data', dataHandler);
          stream.on('end', () => {
            console.log('Subsequent stream ended during input handling.');
            clearTimeout(timer);
            stream.off('data', dataHandler);
            resolve(subsequentOutput);
          });
          stream.on('error', (err: Error) => {
            console.error('Error on subsequent stream during input handling:', err);
            clearTimeout(timer);
            stream.off('data', dataHandler);
            reject(err);
          });
        });

        const outputStr = await subsequentOutputPromise;
        console.log('Subsequent attached output:', outputStr);

        const requiresInput =
          outputStr.includes('Enter first number:') ||
          outputStr.includes('Enter second number:') ||
          outputStr.includes('Enter operation');

        return res.json({
          output: outputStr,
          requiresInput: requiresInput,
          containerId,
        });
      }
    }

    // Case 1: Initial request — create container
    containerId = uuidv4();
    console.log(`Creating new container: ${containerId}`);

    container = await docker.createContainer({
      Image: 'python:3.9-slim',
      name: `code-runner-${containerId}`,
      Cmd: ['python', '-c', code],
      Tty: false,
      OpenStdin: true,
      StdinOnce: false,
    });

    activeContainers.set(containerId, { container, startTime: Date.now(), stream: null });
    await container.start();

    stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true,
    });

    activeContainers.get(containerId).stream = stream;

    let initialOutput = '';
    const outputPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
         console.log('Timeout waiting for initial output.');
         resolve(initialOutput);
      }, 1500);

      stream.on('data', (chunk: Buffer) => {
        initialOutput += chunk.toString();
        if (
          initialOutput.includes('Enter first number:') ||
          initialOutput.includes('Enter second number:') ||
          initialOutput.includes('Enter operation')
        ) {
          console.log('Detected input prompt in initial output.');
          clearTimeout(timer);
          resolve(initialOutput);
        }
      });

      stream.on('end', () => {
        console.log('Initial stream ended.');
        clearTimeout(timer);
        resolve(initialOutput);
      });

      stream.on('error', (err: Error) => {
        console.error('Error on initial stream:', err);
        clearTimeout(timer);
        reject(err);
      });
    });

    const outputStr = await outputPromise;
    console.log('Initial attached output:', outputStr);

    const requiresInput =
      outputStr.includes('Enter first number:') ||
      outputStr.includes('Enter second number:') ||
      outputStr.includes('Enter operation');

    res.json({ output: outputStr, requiresInput, containerId });

    // Stream handling
    stream.on('data', (chunk: Buffer) => {
      console.log('Async stream data:', chunk.toString());
    });

    stream.on('end', async () => {
      try {
        console.log(`Container ${containerId} stream ended.`);
        if (containerId && container) {
          await container.stop({ t: 1 });
          await container.remove();
        }
      } catch (err) {
        console.error(`Error during cleanup for container ${containerId}:`, err);
      } finally {
        if (containerId) {
          activeContainers.delete(containerId);
          console.log(`Cleaned up finished container ${containerId}`);
        }
      }
    });

    stream.on('error', async (err: Error) => {
      console.error(`Error on container ${containerId} stream:`, err);
      try {
        if (containerId && container) {
          await container.stop({ t: 1 }).catch(() => {});
          await container.remove().catch(() => {});
        }
      } catch (cleanupErr) {
        console.error(`Error during error cleanup for container ${containerId}:`, cleanupErr);
      } finally {
        if (containerId) {
          activeContainers.delete(containerId);
          console.log(`Cleaned up errored container ${containerId}`);
        }
      }
    });

    container.wait().then((data) => {
      console.log(`Container ${containerId} exited with status:`, (data as any).StatusCode);
    }).catch((err: Error) => {
      console.error(`Error waiting for container ${containerId} exit:`, err);
    });

  } catch (error) {
    console.error('Error handling /run request:', error);
    if (container && containerId && activeContainers.has(containerId)) {
        try {
           console.log(`Attempting cleanup for container ${containerId} after error.`);
           await container.stop({ t: 1 }).catch(() => {});
           await container.remove().catch(() => {});
        } catch(cleanupError) {
            console.error(`Error during error cleanup for container ${containerId}:`, cleanupError);
        } finally {
             activeContainers.delete(containerId);
             console.log(`Cleaned up container ${containerId} after error.`);
        }
    } else if (container) {
         try {
            console.log('Attempting cleanup for container (not in map) after error.');
            await container.stop({ t: 1 }).catch(() => {});
            await container.remove().catch(() => {});
         } catch(cleanupError) {
            console.error('Error during error cleanup for container (not in map):', cleanupError);
         }
    }
    res.status(500).json({
      error: 'Failed to process the request.',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});