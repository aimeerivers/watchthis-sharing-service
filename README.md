# watchthis-sharing-service

Sharing service for WatchThis - handles media sharing between users.

## 🚀 Status: Phase 1 Complete - Phase 2 Integration

✅ **Service structure initialized**  
✅ **Core sharing operations** (completed)  
✅ **Comprehensive test suite** (31 passing tests)  
🚧 **User integration** (in progress)  
📋 **Event publishing** (planned)

## Overview

The watchthis-sharing-service is responsible for:

- ✅ Creating and managing shares between users
- ✅ Tracking share status (pending, watched, archived)
- 🚧 Validating user permissions for sharing
- ✅ Providing sharing history and analytics
- 🚧 Generating share events for other services

This service is part of the WatchThis microservice ecosystem and integrates with:

- **watchthis-user-service**: For user authentication and validation
- **watchthis-media-service**: For media item references and metadata
- **watchthis-inbox-service**: For organizing shared content in user inboxes

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ running locally
- Git

### PostgreSQL Database Setup

1. **Install PostgreSQL** (if not already installed):

   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql

   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create database and user**:

   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres

   # Create user and databases
   CREATE USER watchthis WITH PASSWORD 'watchthis_dev';
   CREATE DATABASE watchthis_sharing OWNER watchthis;
   CREATE DATABASE watchthis_sharing_test OWNER watchthis;
   GRANT ALL PRIVILEGES ON DATABASE watchthis_sharing TO watchthis;
   GRANT ALL PRIVILEGES ON DATABASE watchthis_sharing_test TO watchthis;
   \q
   ```

3. **Verify connection**:
   ```bash
   psql -U watchthis -d watchthis_sharing -h localhost
   # Enter password: watchthis_dev
   # Should connect successfully, then type \q to quit
   ```

### Installation

```bash
git clone <repository-url>
cd watchthis-sharing-service
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npm run database:setup  # Set up Prisma schema
npm run dev
```

### Test the API

```bash
curl http://localhost:8372/health
```

## Getting started

### Installation

```bash
npm install
```

### Development

```bash
# Run in development mode (auto-restart on changes)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm run test

# Database management
npm run database:setup         # Set up database schema
npm run database:test:setup    # Set up test database schema

# Lint and format code
npm run lint
npm run format
```

## API Endpoints

### Core Sharing Operations ✅ FULLY IMPLEMENTED

```
POST   /api/v1/shares           # Create new share
GET    /api/v1/shares/:id       # Get share details
PATCH  /api/v1/shares/:id       # Update share (mark as watched, etc.)
DELETE /api/v1/shares/:id       # Delete/archive share

GET    /api/v1/shares/sent      # Get shares sent by user
GET    /api/v1/shares/received  # Get shares received by user
GET    /api/v1/shares/stats     # Get sharing statistics
```

**Note:** All endpoints are fully authenticated and tested. User context is automatically extracted from session cookies via the user service integration.

### Authentication ✅ FULLY IMPLEMENTED

- **JWT-based authentication**: All API endpoints require valid JWT tokens in Authorization header
- **User service integration**: Validates JWT tokens via `watchthis-user-service /api/v1/auth/me`
- **Permission enforcement**: Users can only access their own shares
- **Comprehensive testing**: Full test coverage including authentication scenarios

#### Authentication Header Required

All API requests must include a valid JWT access token:

```bash
Authorization: Bearer <access_token>
```

To get JWT tokens, use the `watchthis-user-service` authentication endpoints.

### Health and Monitoring

```
GET    /health                  # Service health check
GET    /ping                    # Simple status check
```

## Database Schema

### Share Collection

```javascript
{
  _id: ObjectId,
  mediaId: ObjectId,           // Reference to media service
  fromUserId: ObjectId,        // Sender (reference to user service)
  toUserId: ObjectId,          // Recipient (reference to user service)
  message: String,             // Optional message with the share
  status: String,              // 'pending', 'watched', 'archived'
  watchedAt: Date,             // When marked as watched
  createdAt: Date,
  updatedAt: Date
}
```

## Architecture Integration

This service integrates with the WatchThis ecosystem:

- **Authentication**: Validates users via watchthis-user-service
- **Media Validation**: Verifies media items via watchthis-media-service
- **Event Publishing**: Publishes share events for inbox and notification services
- **Health Monitoring**: Provides health checks for service discovery

## Format code

The project uses ESLint and Prettier to ensure consistent coding standards.

```bash
npm run lint
npm run format
npm run package:lint
```

- `lint` will check for errors and fix formatting in `.ts` and `.js` files.
- `format` will apply format rules to all possible files.
- `package:lint` will warn of any inconsistencies in the `package.json` file.
