# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

### Server

The server is a Node.js Express application with MongoDB.

```bash
# Navigate to server directory
cd server

# Install dependencies
yarn install

# Start development server
yarn dev

# Run server in debug mode
yarn debug

# Run tests
yarn test               # Run all tests
yarn test:unit          # Run unit tests only
yarn test:integration   # Run integration tests only
yarn test:watch         # Run tests in watch mode
yarn test:coverage      # Run tests with coverage report

# Linting
yarn lint               # Check for lint issues
yarn lint:fix           # Fix lint issues automatically

# Format code
yarn format
```

### Frontend

The frontend is a React application built with Vite.

```bash
# Navigate to front directory
cd front

# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Lint code
yarn lint

# Preview production build
yarn preview
```

## Project Architecture

### Server-side Architecture

The server is a Node.js Express API that handles cookie consent management, analytics, and banner generation.

- **Models**: MongoDB schemas in `server/src/models/` define the data structure
- **Controllers**: Controller files in `server/src/controllers/` handle API endpoints
- **Routes**: Routes in `server/src/routes/v1/` define API endpoints
- **Services**: Business logic in `server/src/services/` implements core functionality
- **Middleware**: Request processing in `server/src/middleware/` handles auth, validation, etc.
- **Utils**: Helper functions in `server/src/utils/` for common tasks
- **Config**: Configuration in `server/src/config/` for database, email, etc.

Key models include:
- `Cookie`: Defines cookie properties, categories, and compliance information
- `ConsentLog`: Tracks user consent records with detailed preferences
- `BannerTemplate`: Stores banner templates with styling and components
- `Domain`: Represents websites where the consent management platform is deployed

### Frontend Architecture

The frontend is a React application that provides a dashboard for managing cookie consent.

- **Components**: React components in `front/src/components/` organized by feature
- **Pages**: Page components in `front/src/pages/` represent full views of the application
- **API**: API client functions in `front/src/api/` for server communication
- **Contexts**: Context providers in `front/src/contexts/` for global state management
- **Utils**: Helper functions in `front/src/utils/` for common tasks

Key features:
- Banner editor for customizing consent banners
- Cookie management dashboard
- Analytics for consent metrics
- Domain management
- Script generation and integration options

## Authentication

The application uses JWT-based authentication with tokens stored in localStorage. The `AuthContext` provider in `front/src/contexts/AuthContext.jsx` manages authentication state and provides login/logout functionality.

## Environment Variables

### Server

Create a `.env` file in the server directory with:

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cookies21
JWT_SECRET=your-secret-key
```

### Frontend

Create a `.env` file in the front directory with:

```
VITE_API_URL=http://localhost:3000/api/v1
```

## Core Functionality

### Cookie Consent Management

The application provides a platform for managing cookie consent according to GDPR and other privacy regulations. Key features include:

1. Banner generation with customizable templates
2. Cookie categorization (necessary, analytics, marketing, etc.)
3. Consent logging and verification
4. Script management for conditionally loading scripts based on consent
5. Analytics for monitoring consent metrics

### TCF Integration

The platform supports IAB's Transparency and Consent Framework (TCF) for standardized consent management with vendors in the adtech ecosystem.