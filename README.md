# Web Code Editor with Terminal

This project is a web-based code editor with an integrated terminal, allowing users to write and execute code in a sandboxed environment and view the output.

## Features

- **Code Editor:** Write code with syntax highlighting (using Monaco Editor).
- **Terminal:** Execute code and view output.
- **Interactive Input:** Provide input to running programs (currently implemented via HTTP polling/short reads, for better real-time experience WebSockets are recommended).
- **Docker Isolation:** Code execution happens within Docker containers for security and consistency.

## Technologies Used

- **Frontend:** React, TypeScript, Styled Components, Axios, Monaco Editor
- **Backend:** Node.js (Express), TypeScript, Dockerode
- **Containerization:** Docker

## Architecture

The project follows a client-server architecture:

- The **Frontend** (React application) provides the user interface with the code editor and terminal.
- The **Backend** (Node.js/Express application) receives code execution requests from the frontend.
- The backend uses **Dockerode** to interact with the Docker daemon, creating and managing Docker containers.
- Code submitted by the user is executed within a Docker container (e.g., `python:3.9-slim`).
- The backend captures the output (stdout and stderr) from the container and sends it back to the frontend.
- For interactive programs, the backend handles sending input from the frontend to the container's stdin.

## Setup and Running

**Prerequisites:**

- Node.js and npm installed.
- Docker installed and running.

1.  **Clone the repository (or ensure you are in the project directory):**

    ```bash
    # If not already there, navigate to your project directory
    cd /path/to/your/Code-Editor
    ```

2.  **Set up the Backend:**

        - Navigate to the `backend` directory:
          ```bash
          cd backend
          ```
        - Install dependencies:
          ```bash
          npm install
          ```
        - Start the backend server:
          `bash

    npm start
    `      The backend should start and listen on`http://localhost:3001`.

3.  **Set up the Frontend:**

        - Navigate back to the project root and then into the `frontend` directory:
          ```bash
          cd ../frontend
          ```
        - Install dependencies, including necessary polyfills for the browser environment:
          ```bash
          npm install buffer react-app-rewired customize-cra
          # Also install other project dependencies if you haven't already:
          # npm install @monaco-editor/react axios styled-components
          ```
        - Ensure you have the `config-overrides.js` file in the `frontend` root with the following content:

          ```javascript
          const webpack = require("webpack");
          const { override } = require("customize-cra");

          module.exports = override((config) => {
            config.resolve.fallback = {
              ...config.resolve.fallback,
              buffer: require.resolve("buffer/"),
            };
            config.plugins = [
              ...config.plugins,
              new webpack.ProvidePlugin({
                Buffer: ["buffer", "Buffer"],
              }),
            ];
            return config;
          });
          ```

        - Ensure your `frontend/package.json` scripts for `start` and `build` use `react-app-rewired`:
          ```json
            "scripts": {
              "start": "react-app-rewired start",
              "build": "react-app-rewired build",
              "test": "react-scripts test",
              "eject": "react-scripts eject"
            },
          ```
        - Start the frontend development server:
          `bash

    npm start
    `      The frontend should open in your browser, usually at`http://localhost:3000`.

## Future Improvements

- Implement **WebSockets** for real-time terminal output and a more responsive interactive experience.
- Add support for **multiple programming languages**.
- Implement basic **file system access** within the container for more complex projects.
- Explore possibilities for **GUI output** (more complex).
- Improve **error handling and reporting**.
- Add **user authentication and project saving**.

## Contributing

Contributions are welcome! Please feel free to open issues or pull requests.

## License

[Specify your license here, e.g., MIT License]

## Deployment Guide

### Prerequisites

- A Render.com account (free tier available)
- A Vercel account (free tier available)
- Docker installed on your local machine
- Git installed on your local machine

### Backend Deployment (Render.com)

1. **Create a new Web Service on Render:**

   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your code editor project

2. **Configure the Backend Service:**

   - Name: `code-editor-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add the following Environment Variables:
     ```
     NODE_ENV=production
     PORT=3001
     ```

3. **Deploy the Backend:**
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Note down the provided URL (e.g., `https://code-editor-backend.onrender.com`)

### Frontend Deployment (Vercel)

1. **Prepare for Vercel Deployment:**

   - Create a `.env.production` file in your frontend directory with:
     ```
     REACT_APP_API_URL=https://your-backend-url.onrender.com
     ```
     (Replace `your-backend-url` with your actual backend URL from step 3 of backend deployment)

2. **Deploy to Vercel:**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - Framework Preset: `Create React App`
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `build`
     - Install Command: `npm install`
   - Add Environment Variables:
     - Add the same `REACT_APP_API_URL` from your `.env.production` file
   - Click "Deploy"

3. **Verify Deployment:**

   - Once deployed, Vercel will provide you with a URL
   - Test the application by:
     - Running some code in the editor
     - Checking if the backend connection works
     - Verifying that Docker container execution works

### Important Notes

1. **CORS Configuration:**

   - The backend is already configured to accept requests from any origin in production
   - If you need to restrict access, update the CORS configuration in `backend/src/index.ts` to only allow your Vercel domain

2. **Docker Access:**

   - Ensure your Render.com service has access to Docker
   - The free tier of Render.com has some limitations on Docker usage

3. **Environment Variables:**

   - Keep your environment variables secure
   - Never commit sensitive information to your repository
   - Make sure to add the environment variables in both Vercel and Render dashboards

4. **Monitoring:**

   - Use Vercel's analytics for frontend performance monitoring
   - Use Render.com's built-in monitoring tools for backend performance
   - Set up alerts for any issues

5. **Scaling:**

   - Vercel's free tier is generous for frontend hosting
   - Render.com's free tier has limitations on concurrent requests
   - Consider upgrading Render.com if you need more backend resources

6. **Custom Domain (Optional):**

   - You can add a custom domain in both Vercel and Render
   - Update the CORS settings and environment variables accordingly
   - Set up proper SSL certificates
