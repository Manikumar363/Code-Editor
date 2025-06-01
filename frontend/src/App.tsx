import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import styled from 'styled-components';
import axios from 'axios';

type TemplateKey = keyof typeof codeTemplates['python'];

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh; // Use min-height to allow content to push the height
  background-color: #1e1e1e;
  color: #ffffff;
`;

// Styled component for the Navbar
const Navbar = styled.nav`
  background-color: #007acc; // Blue background color
  color: white;
  padding: 10px 20px; // Adjust padding as needed
  text-align: center; // Center the title
  font-size: 1.5em; // Adjust font size as needed
  font-weight: bold;
`;


// Styled component for the main content container to center and stack elements
const MainContentContainer = styled.div`
  display: flex;
  flex-direction: column; /* Stack editor and terminal vertically */
  align-items: center; /* Center content horizontally */
  padding: 20px; /* Add some padding around the content */
  max-width: 1200px; /* Set a max width for the content */
  margin: 0 auto; /* Center the container itself */
  flex-grow: 1; /* Allow this container to grow and take available space */
`;


const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%; /* Ensure it takes full width within MainContentContainer */
  margin-bottom: 20px; /* Add space below the editor */
`;

const TerminalContainer = styled.div`
  height: 200px;
  background-color: #2d2d2d;
  padding: 10px;
  font-family: 'Consolas', monospace;
  overflow-y: auto;
  width: 100%; /* Ensure it takes full width within MainContentContainer */
  margin-bottom: 20px; /* Add space below the terminal */
`;

const ButtonContainer = styled.div`
  padding: 10px 0; // Adjusted padding
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #005999;
  }
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

const Select = styled.select`
  padding: 8px;
  background-color: #2d2d2d;
  color: white;
  border: 1px solid #007acc;
  border-radius: 4px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #005999;
  }
`;

const NumberInput = styled.input`
  width: 60px;
  padding: 8px;
  background-color: #2d2d2d;
  color: white;
  border: 1px solid #007acc;
  border-radius: 4px;
  &:focus {
    outline: none;
    border-color: #005999;
  }
`;

const ErrorContainer = styled.div`
  color: #ff6b6b;
  padding: 10px;
  background-color: #2d2d2d;
  margin-top: 10px;
  border-radius: 4px;
  width: 100%; /* Ensure it takes full width within MainContentContainer */
`;

const codeTemplates = {
  python: {
    'Hello World': 'print("Hello, World!")',
    'Calculator': `def calculator():
    print("Calculator started")
    num1 = float(input("Enter first number: "))
    print(f"First number: {num1}")
    num2 = float(input("Enter second number: "))
    print(f"Second number: {num2}")
    operation = input("Enter operation (+, -, *, /): ")
    print(f"Operation: {operation}")
    if operation == '+':
        print(f"Result: {num1 + num2}")
    elif operation == '-':
        print(f"Result: {num1 - num2}")
    elif operation == '*':
        print(f"Result: {num1 * num2}")
    elif operation == '/':
        if num2 == 0:
            print("Error: Division by zero")
        else:
        print(f"Result: {num1 / num2}")
    else:
        print("Invalid operation")
    print("Calculator finished")

calculator()`,
    'Simple Game': `import random

def guess_number():
    number = random.randint(1, 100)
    attempts = 0
    
    while True:
        guess = int(input("Guess a number between 1 and 100: "))
        attempts += 1
        
        if guess < number:
            print("Too low!")
        elif guess > number:
            print("Too high!")
        else:
            print(f"Congratulations! You guessed it in {attempts} attempts!")
            break

guess_number()`
  }
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [code, setCode] = useState('print("Hello, World!")');
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [language, setLanguage] = useState('python');
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  const analyzeError = (errorMessage: string) => {
    const commonErrors = {
      'SyntaxError': 'Check your code syntax. Make sure all parentheses and quotes are properly closed.',
      'NameError': 'You might be using a variable that hasn\'t been defined yet.',
      'TypeError': 'You\'re trying to perform an operation on incompatible types.',
      'IndentationError': 'Python is sensitive to indentation. Make sure your code is properly indented.',
      'ZeroDivisionError': 'You\'re trying to divide by zero. Add a check to prevent this.',
    };

    for (const [errorType, suggestion] of Object.entries(commonErrors)) {
      if (errorMessage.includes(errorType)) {
        setSuggestions([suggestion]);
        break;
      }
    }
  };

  const saveCode = () => {
    const codeData = {
      code,
      language,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('savedCode', JSON.stringify(codeData));
  };

  const loadCode = () => {
    const savedCode = localStorage.getItem('savedCode');
    if (savedCode) {
      const { code: savedCodeContent } = JSON.parse(savedCode);
      setCode(savedCodeContent);
    }
  };

  const processDockerStream = (rawOutput: string): string => {
    let processedOutput = '';
    let buffer = Buffer.from(rawOutput, 'utf8'); // Use Buffer to handle binary data
    let i = 0;

    while (i + 8 <= buffer.length) {
      // Docker stream header is 8 bytes
      // Byte 0: stream type (stdout is 1, stderr is 2)
      // Bytes 1-3: unused
      // Bytes 4-7: size of payload (big-endian uint32)
      const streamType = buffer[i];
      const payloadSize = buffer.readUInt32BE(i + 4);

      // Only process stdout (type 1) and stderr (type 2)
      if ((streamType === 1 || streamType === 2) && i + 8 + payloadSize <= buffer.length) {
        const payload = buffer.toString('utf8', i + 8, i + 8 + payloadSize);
        processedOutput += payload;
        i += 8 + payloadSize;
      } else {
        // If header is not valid or payload goes beyond buffer, stop processing
        console.error('Invalid Docker stream header or payload size.', {streamType, payloadSize, remainingBufferLength: buffer.length - i});
        // Optionally append remaining raw data if header is invalid
        processedOutput += buffer.toString('utf8', i);
        break;
      }
    }
     // Append any remaining data if it's less than a full header
    if (i < buffer.length) {
        processedOutput += buffer.toString('utf8', i);
    }

    return processedOutput;
  };

  const runCode = async (currentInput?: string, currentContainerId?: string | null) => {
    try {
      // If it's a new execution (no container ID provided), clear previous output
      if (!currentContainerId) {
        setOutput([]);
      }
      setError(null);
      setLoading(true);

      // Construct the request body
      const requestBody: any = {
        code,
        language: 'python' // Assuming language is always python for now based on templates
      };

      // Add input and containerId only if provided (subsequent input)
      if (currentInput !== undefined) {
          requestBody.input = currentInput;
      }
      if (currentContainerId) {
          requestBody.containerId = currentContainerId;
      }

      console.log('Sending request to backend:', requestBody);

      const response = await axios.post(`${API_URL}/run`, requestBody);

      console.log('Backend response:', response.data);

      // Always process the output first
      if (response.data.output) {
        // Process the raw Docker stream output to remove headers
        const cleanOutput = processDockerStream(String(response.data.output));
        // Only add non-empty lines
        const outputLines = cleanOutput.split('\n').filter((line: string) => line.length > 0);

        // If it's not the initial run, prepend the user's input line to the output display
        if (currentContainerId && currentInput !== undefined) {
             setOutput(prev => [...prev, `> ${currentInput}`, ...outputLines]);
        } else {
            setOutput(prev => [...prev, ...outputLines]);
        }

      }

      // Update container ID if provided in the response (for initial run)
      // or if it's the same container ID for subsequent runs
      if (response.data.containerId) {
          setActiveContainerId(response.data.containerId);
      } else if (currentContainerId && !response.data.requiresInput) {
           // If no new containerId is returned and no more input is required, clear the active container
           setActiveContainerId(null);
      }

      // Then handle input state based on backend response
      setIsWaitingForInput(response.data.requiresInput);

    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      analyzeError(errorMessage);
      setOutput(prev => [...prev, 'Error: ' + errorMessage]);
      setIsWaitingForInput(false); // Stop waiting for input on error
      setActiveContainerId(null); // Clear container ID on error
    } finally {
      setLoading(false);
    }
  };

  const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isWaitingForInput && activeContainerId) {
      // Call runCode with current input and active container ID
      runCode(input, activeContainerId);
      setInput(''); // Clear the input field after submission
    }
  };

  return (
    <AppContainer>
      {/* Add the Navbar component here */}
      <Navbar>
        Online Code Editor
      </Navbar>

      {/* Use the new styled component for centering and vertical stacking */}
      <MainContentContainer>
      <EditorContainer>
        <Editor
          height="70vh"
          language={language}
          theme={theme}
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
        <ButtonContainer>
          <Button onClick={() => runCode()}>Run Code</Button>
          <Button onClick={saveCode}>Save Code</Button>
          <Button onClick={loadCode}>Load Code</Button>
          
          <Select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
          </Select>

          <Select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="vs-dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </Select>

          <Select 
            onChange={(e) => {
             const value = e.target.value as TemplateKey;
              if (value) {
                setCode(codeTemplates.python[value]);
              }
            }}
          >
            <option value="">Select a template...</option>
            <option value="Hello World">Hello World</option>
            <option value="Calculator">Calculator</option>
            <option value="Simple Game">Simple Game</option>
          </Select>

          <NumberInput 
            type="number" 
            value={fontSize} 
            onChange={(e) => setFontSize(Number(e.target.value))}
            min="8"
            max="24"
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="checkbox" 
              checked={showLineNumbers} 
              onChange={(e) => setShowLineNumbers(e.target.checked)}
            />
            Line Numbers
          </label>
        </ButtonContainer>
        </EditorContainer>

        <TerminalContainer>
          {output.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
          {isWaitingForInput && (
            <TerminalInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputSubmit}
              placeholder="Enter input..."
            />
          )}
        </TerminalContainer>

        {error && (
          <ErrorContainer>
            <h3>Error Analysis:</h3>
            {suggestions.map((suggestion, index) => (
              <p key={index}>{suggestion}</p>
            ))}
          </ErrorContainer>
        )}
      </MainContentContainer>

    </AppContainer>
  );
}

export default App;