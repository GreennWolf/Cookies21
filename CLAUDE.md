
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Siempre hablaras en español:
Cookies21 is a comprehensive cookie consent management platform that provides GDPR and privacy regulation compliance through customizable consent banners, cookie management, and analytics tracking.

## Development Commands

### Frontend (React + Vite)

```bash
cd front
yarn install       # Install dependencies
yarn dev          # Start development server (http://localhost:5173)
yarn build        # Build for production
yarn lint         # Run ESLint
yarn preview      # Preview production build
```

### Backend (Node.js + Express + MongoDB)

```bash
cd server
yarn install              # Install dependencies
yarn dev                  # Start development server with nodemon
yarn start                # Start production server
yarn test                 # Run all tests
yarn test:unit            # Run unit tests only
yarn test:integration     # Run integration tests only
yarn test:watch           # Watch mode for tests
yarn test:coverage        # Run tests with coverage report
yarn test -- path/to/test.js  # Run specific test file
yarn lint                 # Run ESLint
yarn lint:fix            # Fix linting issues
```

## Architecture Overview

### Backend Architecture

The server follows a layered architecture pattern:

1. **Routes** (`/server/src/routes/v1/`) - API endpoint definitions
2. **Controllers** (`/server/src/controllers/`) - Request handling and response formatting
3. **Services** (`/server/src/services/`) - Business logic implementation
4. **Models** (`/server/src/models/`) - MongoDB schemas and data models
5. **Middleware** (`/server/src/middleware/`) - Authentication, validation, error handling
6. **Jobs** (`/server/src/jobs/`) - Background tasks and scheduled jobs using Bull queue

Key Services:
- `bannerGenerator.service.js` - Generates HTML/CSS/JS for consent banners
- `consentScriptGenerator.service.js` - Creates consent management scripts
- `analytics.service.js` - Processes consent analytics data
- `scanner.service.js` - Scans websites for cookies
- `tcf.service.js` - IAB TCF v2.2 compliance
- `imageProcessor.service.js` - Handles banner image uploads and optimization
- `bannerTranslation.service.js` - Manages multi-language banner content

### Frontend Architecture

The frontend is a React SPA with:

1. **Pages** (`/front/src/pages/`) - Route-level components
2. **Components** (`/front/src/components/`) - Reusable UI components organized by feature
3. **API** (`/front/src/api/`) - API client functions for backend communication
4. **Contexts** (`/front/src/contexts/`) - Global state management (Auth)
5. **Utils** (`/front/src/utils/`) - Helper functions and utilities
6. **UI Components** (`/front/src/components/ui/`) - Shadcn UI components with Tailwind CSS

## Technology Stack

### Frontend
- React 19 + Vite
- Tailwind CSS + Shadcn UI
- React Router v7
- React DnD for drag-and-drop
- Chart.js for analytics visualization
- Axios for API communication

### Backend
- Node.js + Express
- MongoDB with Mongoose
- JWT authentication
- Bull + Redis for job queues
- Puppeteer for web scraping
- Nodemailer for email services
- Winston for logging

## Banner Editor System

The banner editor is a complex drag-and-drop system with:

### Key Components
- `BannerEditor.jsx` - Main editor interface
- `useBannerEditor.js` - Core editor logic hook
- `ComponentRenderer.jsx` - Renders draggable components
- `BannerPropertyPanel.jsx` - Component property editing
- `FullScreenBannerEditor.jsx` - Full-screen editing mode

### Component Types
1. **Container** - Layout wrapper that can hold other components
2. **Text** - Text elements with rich formatting
3. **Button** - Interactive buttons (Accept, Reject, Preferences)
4. **Image** - Uploaded images with optimization
5. **Preference Center** - Cookie category selection interface

### Positioning System
- **Fixed** - Static position within container
- **Floating** - Anchored to viewport edges
- **Responsive** - Automatic mobile/tablet/desktop adaptation

## API Authentication

JWT-based authentication with Bearer tokens:
```
Authorization: Bearer <token>
```

Multi-tenant architecture with role-based access:
- **owner** - Full system access
- **admin** - Client-level administration
- **user** - Standard user permissions

## Testing Configuration

### Jest Setup
- Node environment with MongoDB Memory Server
- Separate projects for unit and integration tests
- 80% minimum coverage threshold
- 30-second test timeout
- Leak detection enabled

### Running Tests
```bash
# Backend
cd server
yarn test path/to/specific.test.js  # Run specific test
yarn test:watch                     # Watch mode
yarn test:coverage                  # With coverage report

# Frontend (if tests are implemented)
cd front
yarn test
```

### Test Organization
- Unit tests: Test individual functions/modules
- Integration tests: Test API endpoints and database operations
- E2E tests: Test complete user workflows
- Test fixtures available in `/server/src/tests/fixtures/`

### Test Environment
- MongoDB Memory Server for database testing
- Mocked external services (Redis, Bull, Puppeteer, Email)
- Test data generators for consistent test scenarios

## Common Development Tasks

### Adding a New API Endpoint
1. Create validation schema in `/server/src/validations/`
2. Add route in `/server/src/routes/v1/`
3. Implement controller in `/server/src/controllers/`
4. Add business logic in `/server/src/services/`
5. Write tests in `/server/src/tests/`

### Modifying the Banner Editor
1. Components are in `/front/src/components/banner/Editor/`
2. Editor state is managed by `useBannerEditor` hook
3. Server-side rendering logic in `bannerGenerator.service.js`
4. Always test responsive behavior and container nesting

### Working with Translations
- Banner translations are stored in the database
- Language switching is handled client-side
- Default language is configurable per banner template
- Translation service handles multi-language content

## Environment Setup

### Backend (.env)
```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cookies21
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
EMAIL_FROM=noreply@cookies21.com
# Email provider (SMTP or AWS SES configuration)
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api/v1
```

## Important Patterns

### Error Handling
- Controllers use `catchAsync` wrapper for async error handling
- Services throw `AppError` for business logic errors
- Consistent error response format
- Global error middleware for centralized handling

### Image Processing
- Automatic optimization on upload
- Memory management for large images
- Support for multiple formats (PNG, JPG, WebP, ICO)
- Temporary file cleanup after processing

### Container Validation
- Bounds checking to prevent overflow
- Nesting depth limits
- Responsive breakpoint handling
- Position validation for floating elements

### Queue Processing
- Bull queue with Redis for background jobs
- Cookie analysis jobs
- Scheduled tasks for analytics
- Email sending through queue

## Debugging Tips

### Banner Editor Issues
1. Check browser console for component state
2. Use `bannerDebugHelper.js` for layout debugging
3. Verify container bounds with `containerBoundsValidator.js`
4. Check responsive utils for breakpoint handling

### API Issues
1. Check server logs in `/server/logs/`
2. Use `yarn debug` for Node.js debugging
3. Verify JWT token validity
4. Check MongoDB connection status

### Cookie Scanning
1. Scanner logs available in `ScanLogsConsole` component
2. Check Redis for queue status
3. Verify domain DNS resolution
4. Monitor Puppeteer browser instances

## Production Deployment

### PM2 Configuration
- Application name: `cookie21-server`
- Max memory: 512MB
- Production URLs: `api.cookie21.com` and `admin.cookie21.com`
- Configuration in `ecosystem.config.js`

### Build Process
- Frontend: `yarn build` in `/front` directory
- Static assets served from `/server/public/`
- Template images stored in `/server/public/templates/images/`

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
