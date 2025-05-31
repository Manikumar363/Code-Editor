import React from 'react';

interface ErrorAnalysisProps {
  error: string | null;
}

const ErrorAnalysis: React.FC<ErrorAnalysisProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="error-analysis">
      <h3>Error Analysis</h3>
      <pre>{error}</pre>
    </div>
  );
};

export default ErrorAnalysis;
