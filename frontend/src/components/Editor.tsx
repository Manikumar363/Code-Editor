import React from 'react';
import Editor from '@monaco-editor/react';

interface EditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
}

const CodeEditor: React.FC<EditorProps> = ({ code, onChange }) => {
  return (
    <Editor
      height="70vh"
      defaultLanguage="python"
      defaultValue={code}
      onChange={onChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
};

export default CodeEditor;
