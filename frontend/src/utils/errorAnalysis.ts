interface ErrorDetails {
  message: string;
  line?: number;
  column?: number;
  type?: string;
}

export const analyzeError = (error: string): ErrorDetails => {
  // Basic error analysis for Python errors
  const lineMatch = error.match(/line (\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

  return {
    message: error,
    line,
    type: error.includes('SyntaxError') ? 'syntax' : 'runtime',
  };
};

export const formatError = (error: ErrorDetails): string => {
  let formatted = error.message;
  if (error.line) {
    formatted += `\nLine: ${error.line}`;
  }
  if (error.type) {
    formatted += `\nType: ${error.type}`;
  }
  return formatted;
};
