export const defaultPythonTemplate = `# Write your Python code here
print("Hello, World!")`;

export const getTemplateForLanguage = (language: string): string => {
  switch (language.toLowerCase()) {
    case 'python':
      return defaultPythonTemplate;
    default:
      return defaultPythonTemplate;
  }
};
