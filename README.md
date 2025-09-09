# watchthis-sharing-service

Sharing service for WatchThis - handles media sharing between users.

## 🚀 Status: Phase 1 Complete - Phase 2 Integration

✅ **Service structure initialized**  
✅ **Core sharing operations** (completed)  
✅ **Comprehensive test suite** (31 passing tests)  
� **User integration** (in progress)  
📋 **Event publishing** (planned)

## Overview

The watchthis-sharing-service is responsible for:

- ✅ Creating and managing shares between users
- ✅ Tracking share status (pending, watched, archived)
- 🚧 Validating user permissions for sharing
- ✅ Providing sharing history and analytics
- � Generating share events for other services

This service is part of the WatchThis microservice ecosystem and integrates with:

- **watchthis-user-service**: For user authentication and validation
- **watchthis-media-service**: For media item references and metadata
- **watchthis-inbox-service**: For organizing shared content in user inboxes

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally
- Git

### Installation

```bash
git clone <repository-url>
cd watchthis-sharing-service
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Test the API

```bash
curl http://localhost:8372/health
```

## Getting started

Add a `.env` file and add some environment variables:

```text
BASE_URL=http://localhost:8372
MONGO_URL=mongodb://localhost:27017/sharing-service
USER_SERVICE_URL=http://localhost:8583
MEDIA_SERVICE_URL=http://localhost:8584
```

Install npm dependencies

```bash
npm install
```

## Build the source code

```bash
npm run build
```

## Run unit tests

```bash
npm run test
```

**Status:** ✅ All 31 tests passing - Complete API coverage including CRUD operations, validation, pagination, and error handling.

## Build CSS

```bash
npm run tailwind:css
```

## Run the server locally

```bash
npm run start
```

Visit http://localhost:8372 in your browser

## Run in development mode

```bash
npm run dev
```

This will automatically rebuild the source code and restart the server for you.

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

**Note:** All endpoints are functional and tested. Authentication integration is pending - currently requires `userId` in query params or `fromUserId` in request body.

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
