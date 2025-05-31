// frontend/src/components/Terminal.tsx
import React from 'react';
import styled from 'styled-components';

const TerminalContainer = styled.div`
  height: 200px;
  background-color: #2d2d2d;
  padding: 10px;
  font-family: 'Consolas', monospace;
  overflow-y: auto;
`;

const TerminalInput = styled.input`
  background-color: transparent;
  border: none;
  color: white;
  font-family: 'Consolas', monospace;
  width: 100%;
  outline: none;
  margin-top: 10px;
`;

interface TerminalProps {
  output: string[];
  input: string;
  isWaitingForInput: boolean;
  onInputChange: (value: string) => void;
  onInputSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Terminal: React.FC<TerminalProps> = ({
  output,
  input,
  isWaitingForInput,
  onInputChange,
  onInputSubmit
}) => {
  return (
    <TerminalContainer>
      {output.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
      {isWaitingForInput && (
        <TerminalInput
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputSubmit}
          placeholder="Enter input..."
        />
      )}
    </TerminalContainer>
  );
};

export default Terminal;