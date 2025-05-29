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
yarn test:clear         # Clear Jest cache
yarn test:ci            # Run tests in CI mode with coverage
yarn test:debug         # Run tests with Node debugging

# Linting and formatting
yarn lint               # Check for lint issues
yarn lint:fix           # Fix lint issues automatically
yarn format             # Format code with Prettier

# Database operations
yarn migrate            # Run database migrations
yarn migrate:undo       # Undo last migration
yarn seed               # Seed database with test data
yarn seed:undo          # Remove seeded data

# Docker operations
yarn docker:build       # Build Docker image
yarn docker:run         # Run Docker container

# Scripts
node src/scripts/createOwner.js       # Create owner account
node src/scripts/resetOwnerPassword.js # Reset owner password
node src/scripts/check-env.js         # Verify environment setup
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
- **Validations**: Request validation schemas in `server/src/validations/` using express-validator
- **Jobs**: Background job processors in `server/src/jobs/` for scheduled tasks
- **Tests**: Test files in `server/src/tests/` organized by unit/integration/e2e

Key models include:
- `Cookie`: Defines cookie properties, categories, and compliance information
- `ConsentLog`: Tracks user consent records with detailed preferences
- `BannerTemplate`: Stores banner templates with styling and components
- `Domain`: Represents websites where the consent management platform is deployed
- `Client`: Multi-tenant client accounts with subscription management
- `UserAccount`: User authentication and role management
- `Analytics`: Stores consent analytics and metrics data

Key services:
- `bannerGenerator.service.js`: Generates HTML/CSS/JS for consent banners
- `consentScriptGenerator.service.js`: Creates consent management scripts
- `imageProcessor.service.js`: Handles image uploads and processing for banners
- `analytics.service.js`: Processes and aggregates consent analytics
- `email.service.js`: Email notifications using AWS SES
- `tcf.service.js`: IAB TCF v2.2 compliance implementation

### Frontend Architecture

The frontend is a React application that provides a dashboard for managing cookie consent.

- **Components**: React components in `front/src/components/` organized by feature
  - `banner/Editor/`: Complex drag-and-drop banner editor components
  - `analytics/`: Charts and data visualization components
  - `domain/`: Domain management components
  - `cookie/`: Cookie listing and management
  - `ui/`: Reusable UI components (shadcn/ui based)
- **Pages**: Page components in `front/src/pages/` represent full views of the application
- **API**: API client functions in `front/src/api/` for server communication
- **Contexts**: Context providers in `front/src/contexts/` for global state management
- **Utils**: Helper functions in `front/src/utils/` for common tasks
  - Banner validation and configuration helpers
  - Image processing utilities
  - Container bounds validation
  - Position and style utilities

Key features:
- Banner editor with drag-and-drop functionality
- Real-time banner preview with responsive design
- Cookie management dashboard with scanning capabilities
- Analytics dashboard with consent metrics
- Domain management with multi-domain support
- Script generation and integration options (Google Analytics, GTM, IAB TCF)
- Webhook integration for external systems

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
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379

# Email Configuration (AWS SES)
EMAIL_FROM=noreply@yourdomain.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Optional: Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
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

## Testing Strategy

### Server Testing

The server uses Jest for testing with separate configurations for unit and integration tests.

```bash
# Run specific test file
yarn test path/to/test.test.js

# Run tests matching pattern
yarn test --testNamePattern="should create cookie"

# Debug specific test
yarn test:debug path/to/test.test.js
```

Test organization:
- **Unit tests**: `server/src/tests/unit/` - Test individual functions and modules
- **Integration tests**: `server/src/tests/integration/` - Test API endpoints and database operations
- **E2E tests**: `server/src/tests/e2e/` - Test complete user flows
- **Fixtures**: `server/src/tests/fixtures/` - Reusable test data

## Banner Editor Architecture

The banner editor is a complex drag-and-drop system for creating consent banners.

### Key Concepts

1. **Components**: Banner elements (containers, text, buttons, images) with hierarchical structure
2. **Containers**: Can hold other components, support nesting and layout options
3. **Positioning**: Supports fixed, floating, and responsive positioning
4. **Responsive Design**: Automatic adaptation for mobile/tablet/desktop views
5. **Image Processing**: Automatic optimization and memory management for uploaded images

### Important Files

- `BannerEditor.jsx`: Main editor component with state management
- `useBannerEditor.js`: Custom hook for editor logic and state
- `ComponentRenderer.jsx`: Renders banner components with drag-and-drop
- `bannerGenerator.service.js`: Server-side HTML/CSS/JS generation
- `containerBoundsValidator.js`: Validates component positioning and bounds
- `imageMemoryManager.js`: Manages image memory and optimization

## API Patterns

### Authentication
All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Error Handling
API returns consistent error format:
```json
{
  "status": "error",
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

### Pagination
List endpoints support pagination:
```
GET /api/v1/cookies?page=1&limit=10&sort=-createdAt
```

### Multi-tenancy
The platform supports multiple clients with domain-based isolation. Each client has their own:
- Domains
- Cookie configurations
- Banner templates
- Analytics data
- Users with role-based permissions