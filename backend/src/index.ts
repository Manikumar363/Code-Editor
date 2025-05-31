import express from 'express';
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
        await container.stop({ t: 5 });
        await container.remove();
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
app.post('/run', async (req, res) => {
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

      container = containerObj.container;
      stream = containerObj.stream;
      containerId = existingContainerId;

      if (input !== undefined) {
        console.log('Writing input to container stream:', input);
        
        // Re-attach specifically for stdin to ensure clean writing
        if (!container) {
             console.error('Container is undefined when attempting to write input.');
             res.status(500).json({ error: 'Container is not available for writing input' });
             return;
        }
        const writeStream = await container.attach({
            stream: true,
            stdin: true,
            stdout: false, // Don't need stdout/stderr for writing
            stderr: false,
            hijack: true
        });

        if (writeStream.writable) {
             writeStream.write(input + '\n');
             // Close the write stream after writing input
             // Note: Closing might affect the main stream, need to test
             // writeStream.end(); // Use end() to signal end of writing

        } else {
            console.error('Container stream is not writable.');
             res.status(500).json({ error: 'Container stream is not writable' });
             // It might be necessary to clean up the container here if the stream is broken
             return;
        }

       // For subsequent inputs, read output from the stream briefly
       let subsequentOutput = '';
       const subsequentOutputPromise = new Promise<string>((resolve, reject) => {
         const timer = setTimeout(() => resolve(subsequentOutput), 1000);
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
             clearTimeout(timer);
             stream.off('data', dataHandler);
             resolve(subsequentOutput);
           }
         };

         stream.on('data', dataHandler);
         stream.on('end', () => {
           clearTimeout(timer);
           stream.off('data', dataHandler);
           resolve(subsequentOutput);
         });
         stream.on('error', (err: Error) => {
           clearTimeout(timer);
           stream.off('data', dataHandler);
           reject(err);
         });
       });

       const outputStr = await subsequentOutputPromise;
       const requiresInput =
         outputStr.includes('Enter first number:') ||
         outputStr.includes('Enter second number:') ||
         outputStr.includes('Enter operation');

       return res.json({
         output: outputStr,
         requiresInput,
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
      const timer = setTimeout(() => resolve(initialOutput), 1500);

      stream.on('data', (chunk: Buffer) => {
        initialOutput += chunk.toString();
        if (
          initialOutput.includes('Enter first number:') ||
          initialOutput.includes('Enter second number:') ||
          initialOutput.includes('Enter operation')
        ) {
          clearTimeout(timer);
          resolve(initialOutput);
        }
      });

      stream.on('end', () => {
        clearTimeout(timer);
        resolve(initialOutput);
      });

      stream.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const outputStr = await outputPromise;
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
        if (container) {
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
        if (container) {
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
      console.log(`Container ${containerId} exited with status:`, data.StatusCode);
    }).catch((err: Error) => {
      console.error(`Error waiting for container ${containerId} exit:`, err);
    });

  } catch (error) {
    console.error('Error handling /run request:', error);
    if (container && containerId && activeContainers.has(containerId)) {
      try {
        console.log(`Attempting cleanup for container ${containerId} after error`);
        await container.stop({ t: 1 }).catch(() => {});
        await container.remove().catch(() => {});
      } catch (cleanupError) {
        console.error(`Error cleaning up container ${containerId} after exception:`, cleanupError);
      } finally {
        activeContainers.delete(containerId);
        console.log(`Cleaned up container ${containerId} after error`);
      }
    }
    res.status(500).json({ error: 'Failed to process the request.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
