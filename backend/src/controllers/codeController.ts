// backend/src/controllers/codeController.ts
import { Request, Response } from 'express';
import { docker, DOCKER_CONFIG } from '../config/docker';
import { v4 as uuidv4 } from 'uuid';

export const runCode = async (req: Request, res: Response) => {
  const { code, input } = req.body;
  const containerId = uuidv4();

  try {
    const container = await docker.createContainer({
      Image: DOCKER_CONFIG.IMAGE,
      name: `code-runner-${containerId}`,
      Cmd: ['python', '-c', code],
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      HostConfig: {
        Memory: DOCKER_CONFIG.MEMORY_LIMIT,
        MemorySwap: DOCKER_CONFIG.MEMORY_LIMIT,
        CpuPeriod: 100000,
        CpuQuota: DOCKER_CONFIG.CPU_LIMIT * 1000,
      }
    });

    // ... rest of the code execution logic
  } catch (error) {
    // ... error handling
  }
};