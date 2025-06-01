# Web Code Editor with Terminal

This project is a web-based code editor with an integrated terminal, allowing users to write and execute code in a sandboxed environment and view the output.
![image](https://github.com/user-attachments/assets/1b60df61-649f-4dbd-8d1b-e4c112cec77a)

## Features

- **Code Editor:** Write code with syntax highlighting (using Monaco Editor).
- **Terminal:** Execute code and view output.
- **Interactive Input:** Provide input to running programs.
- **Docker Isolation:** Code execution happens within Docker containers for security and consistency.

## Technologies Used

- **Frontend:** React, TypeScript, Styled Components, Axios, Monaco Editor
- **Backend:** Node.js (Express), TypeScript, Dockerode
- **Containerization:** Docker
- **Deployment:** AWS EC2, Vercel, PM2 (Process Manager), Caddy (Reverse Proxy/SSL)

## Architecture

The project follows a client-server architecture:

- The **Frontend** (React application) provides the user interface with the code editor and terminal.
- The **Backend** (Node.js/Express application) receives code execution requests from the frontend.
- The backend uses **Dockerode** to interact with the Docker daemon, creating and managing Docker containers.
- Code submitted by the user is executed within a Docker container (e.g., `python:3.9-slim`).
- The backend captures the output (stdout and stderr) from the container and sends it back to the frontend.
- For interactive programs, the backend handles sending input from the frontend to the container's stdin.
- **AWS EC2** hosts the backend application and Docker service.
- **Caddy** runs on EC2 as a reverse proxy to provide HTTPS access to the backend.
- **PM2** manages the backend process on EC2, ensuring it runs persistently.
- **Vercel** hosts the frontend application.

## Setup and Running (Local Development)

**Prerequisites:**

- Node.js and npm installed.
- Docker installed and running.
- Git installed.

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd Code-Editor
    ```
    (Replace `<your-repo-url>` with your project's GitHub URL)

2.  **Set up the Backend:**

    - Navigate to the `backend` directory:
      ```bash
      cd backend
      ```
    - Install dependencies:
      ```bash
      npm install
      ```
    - Build the TypeScript code:
      ```bash
      npm run build
      ```
    - Start the backend server:
      ```bash
      npm start
      ```
      The backend should start and listen on `http://localhost:3001`.

3.  **Set up the Frontend:**

    - Navigate back to the project root and then into the `frontend` directory:
      ```bash
      cd ../frontend
      ```
    - Install dependencies, including necessary polyfills:
      ```bash
      npm install
      ```
    - Ensure you have the `config-overrides.js` file in the `frontend` root with the following content to handle buffer polyfill (needed for `dockerode` usage in frontend if any, or just for build compatibility):

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
    - Create a `.env` file in the `frontend` directory with the backend API URL (for local development):
      ```
      REACT_APP_API_URL=http://localhost:3001
      ```
    - Start the frontend development server:
      ```bash
      npm start
      ```
      The frontend should open in your browser, usually at `http://localhost:3000`.

## Deployment Guide

### Prerequisites

- An AWS account
- A Vercel account
- A domain name or a free dynamic DNS hostname (e.g., from Duck DNS)
- Git installed locally

### Backend Deployment (AWS EC2)

1.  **Launch an EC2 Instance:**
    - Go to the AWS EC2 console.
    - Launch a new EC2 instance (e.g., using an Amazon Linux 2023 AMI).
    - Configure network settings to assign a Public IPv4 address.
    - Create or select a key pair for SSH access.
    - Configure a Security Group to allow inbound SSH traffic (Port 22). You will add rules for HTTP (80) and HTTPS (443) later.

2.  **Connect to the EC2 Instance:**
    - Use SSH and your key pair to connect to the instance's Public IPv4 address.

3.  **Install Prerequisites on EC2:**
    - Update packages:
      ```bash
      sudo dnf update -y
      ```
    - Install Git:
      ```bash
      sudo dnf install git -y
      ```
    - Install Node.js and npm (using NodeSource repository for a recent version, e.g., Node.js 20 LTS):
      ```bash
      curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
      sudo dnf install -y nodejs
      ```
    - Install Docker:
      ```bash
      sudo dnf install docker -y
      sudo systemctl start docker
      sudo systemctl enable docker
      sudo usermod -a -G docker ec2-user # Replace ec2-user with your username
      # Log out and log back in via SSH for group changes to apply
      ```
    - Pull necessary Docker images (e.g., Python):
      ```bash
      docker pull python:3.9-slim # Or other images your code uses
      ```

4.  **Get Backend Code on EC2:**
    - Clone your repository:
      ```bash
      git clone <your-repo-url>
      cd Code-Editor/backend
      ```
    - Install backend dependencies:
      ```bash
      npm install
      ```
    - Build the backend code:
      ```bash
      npm run build
      ```

5.  **Set up PM2 for Persistent Running:**
    - Install PM2 globally:
      ```bash
      sudo npm install -g pm2
      ```
    - Start the backend with PM2:
      ```bash
      pm2 start dist/index.js --name code-editor-backend
      ```
    - Save the process list:
      ```bash
      pm2 save
      ```
    - Generate and install startup script (copy the output command and run it with `sudo`):
      ```bash
      sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
      ```

6.  **Set up Caddy for HTTPS:**
    - **Point a Domain/Hostname to EC2:** Configure an A record in your DNS settings (or using a service like Duck DNS) to point your chosen domain/subdomain (e.g., `api.your-domain.com` or `yourhostname.duckdns.org`) to your EC2 instance's Public IPv4 address.
    - **Update EC2 Security Group:** In the AWS console, add inbound rules to your EC2 security group for:
        - **HTTP** (Port 80) from `0.0.0.0/0`
        - **HTTPS** (Port 443) from `0.0.0.0/0`
    - Install Caddy (requires adding a repository, e.g., EPEL 9 compatible):
      ```bash
      sudo dnf install -y dnf-plugins-core
      sudo dnf copr enable @caddy/caddy epel-9-x86_64 -y
      sudo dnf install caddy -y
      ```
    - Edit the Caddyfile (`/etc/caddy/Caddyfile`) with `sudo nano /etc/caddy/Caddyfile`. Replace the content with:
      ```caddyfile
      yourhostname.duckdns.org { # Replace with your actual domain/hostname
          reverse_proxy localhost:3001
      }
      ```
      Save and exit.
    - Restart Caddy:
      ```bash
      sudo systemctl enable caddy
      sudo systemctl restart caddy
      ```
      Verify status (`sudo systemctl status caddy`) and check logs (`sudo journalctl -u caddy`) for successful certificate issuance.

### Frontend Deployment (Vercel)

1.  **Connect to Vercel:**
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click "New Project".
    - Import your GitHub repository containing the frontend code.

2.  **Configure the Vercel Project:**
    - Framework Preset: `Create React App` (or appropriate for your frontend setup)
    - Root Directory: `frontend`
    - Build Command: `npm run build`
    - Output Directory: `build`
    - Install Command: `npm install`

3.  **Add Environment Variables:**
    - Go to Project Settings -> Environment Variables.
    - Add a variable named `REACT_APP_API_URL`.
    - Set its value to the HTTPS URL of your EC2 backend via Caddy:
      ```
      https://yourhostname.duckdns.org # Replace with your actual hostname
      ```
      (No port needed for HTTPS).

4.  **Deploy:**
    - Click "Deploy". Vercel will build and deploy your frontend. Subsequent pushes to your GitHub repository will trigger automatic redeployments.

5.  **Verify Deployment:**
    - Access your Vercel-provided URL.
    - Test the application by running code, including interactive examples like the Calculator, to ensure the frontend connects to your EC2 backend over HTTPS and code execution works.

## Future Improvements

- Implement **WebSockets** for real-time terminal output.
- Add support for **multiple programming languages**.
- Implement basic **file system access**.
- Explore possibilities for **GUI output**.
- Improve **error handling and reporting**.
- Add **user authentication and project saving**.
- Configure a more robust production setup for the backend (e.g., using a non-free tier EC2 instance, dedicated Elastic IP, domain from a registrar, more advanced monitoring).

## Contributing

Contributions are welcome! Please feel free to open issues or pull requests.

## License

[Specify your license here, e.g., MIT License]
