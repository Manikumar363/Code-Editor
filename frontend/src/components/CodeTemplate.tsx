// frontend/src/components/Editor.tsx
import React from 'react';
import Editor from '@monaco-editor/react';

interface EditorProps {
  code: string;
  language: string;
  theme: string;
  fontSize: number;
  showLineNumbers: boolean;
  onChange: (value: string | undefined) => void;
}

const CodeEditor: React.FC<EditorProps> = ({
  code,
  language,
  theme,
  fontSize,
  showLineNumbers,
  onChange
}) => {
  return (
    <Editor
      height="70vh"
      language={language}
      theme={theme}
      value={code}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
};

export default CodeEditor;