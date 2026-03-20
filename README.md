# Legacy Code Modernizer

This project is a web-based tool for modernizing legacy code (Java, COBOL) into modern languages like Python and Go. It uses a large language model to perform the code conversions.

## Features

- **Code Ingestion**: Upload code via file upload or by providing a GitHub repository URL.
- **Language Conversion**: Converts Java and COBOL to Python or Go.
- **Dependency Mapping**: Analyzes dependencies to ensure context-aware conversion.
- **GitHub Integration**: Fetches code from GitHub repositories and can create a pull request with the converted code.
- **User Authentication**: Secure login with Google.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Authentication**: Firebase Authentication (Google Provider)
- **Code Conversion**: Groq API with Llama 3.3
- **GitHub Integration**: Octokit

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/sandeepmk2006/Legacy-Code-Modernization.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd Legacy-Code-Modernization
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root of the project and add the following environment variables. You can use the `.env.example` file as a template.

```
GROQ_API_KEY="your_groq_api_key"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_firebase_app_id"
VITE_FIREBASE_MEASUREMENT_ID="your_firebase_measurement_id"
```

### Running the Application

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Serves the production build locally.
- `npm run lint`: Lints the code.
- `npm run format`: Formats the code.
