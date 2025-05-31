// backend/src/config/docker.ts
import Docker from 'dockerode';

export const docker = new Docker();

export const DOCKER_CONFIG = {
  EXECUTION_TIMEOUT: 5000,
  MEMORY_LIMIT: '100m',
  CPU_LIMIT: 50,
  IMAGE: 'python:3.9-slim'
};