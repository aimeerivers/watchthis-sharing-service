# WatchThis Sharing Service Implementation Plan

## Project Status Overview

The `watchthis-sharing-service` is the core service that enables users to share media content with friends in the WatchThis platform. This service acts as the bridge between users, connecting the media service with the inbox service to create a complete sharing ecosystem.

**🚧 PHASE 1 IN PROGRESS** - Core sharing operations and service structure

## Implementation Phases

### Phase 1: Core Sharing Operations 🚧 IN PROGRESS

#### 🟡 High Priority - MVP Functionality

##### 1. Service Structure ✅ COMPLETED

- [x] Set up Express application with TypeScript
- [x] Configure MongoDB connection with Mongoose
- [x] Add security headers with Helmet
- [x] Set up development environment with hot reloading
- [x] Create package.json with proper dependencies

##### 2. Share Model and Database Schema 🚧 NEXT

- [ ] Create Share model with Mongoose schema
- [ ] Implement validation for user IDs and media IDs
- [ ] Add share status tracking (pending, watched, archived)
- [ ] Create database indexes for performance
- [ ] Add message field for optional share messages
- [ ] Implement timestamps and audit fields

##### 3. Basic CRUD Operations 🚧 TODO

- [ ] `POST /api/v1/shares` - Create new share
- [ ] `GET /api/v1/shares/:id` - Retrieve share by ID
- [ ] `PATCH /api/v1/shares/:id` - Update share status
- [ ] `DELETE /api/v1/shares/:id` - Archive/delete share
- [ ] `GET /api/v1/shares/sent` - List shares sent by user
- [ ] `GET /api/v1/shares/received` - List shares received by user

##### 4. User and Media Validation 🚧 TODO

- [ ] Integrate with user service for authentication
- [ ] Validate user permissions for sharing
- [ ] Verify media items exist via media service
- [ ] Prevent users from sharing with themselves
- [ ] Handle friend/connection validation
- [ ] Add proper error handling for invalid references

##### 5. Share Status Management 🚧 TODO

- [ ] Track share lifecycle (pending → watched → archived)
- [ ] Implement watched timestamp tracking
- [ ] Add share statistics and analytics
- [ ] Handle bulk status updates
- [ ] Implement share expiration (optional)

### Phase 2: Service Integration 📋 PLANNED

#### 🟡 High Priority - Ecosystem Integration

##### 1. Authentication Integration

- [ ] Integrate with watchthis-user-service for auth
- [ ] Add user context to all share operations
- [ ] Implement permission checks
- [ ] Track shares by authenticated user
- [ ] Add user-specific share queries

##### 2. Media Service Integration

- [ ] Validate media items exist before sharing
- [ ] Fetch media metadata for shares
- [ ] Handle media service failures gracefully
- [ ] Cache media validation results
- [ ] Add media type restrictions (if needed)

##### 3. Event Publishing

- [ ] Implement share event publishing
- [ ] Publish `ShareCreatedEvent` when shares are created
- [ ] Publish `ShareWatchedEvent` when marked as watched
- [ ] Add event validation and error handling
- [ ] Document event schemas for other services

### Phase 3: Advanced Features 📋 FUTURE

#### 🟢 Medium Priority - Enhanced Functionality

##### 1. Friendship/Connection System

- [ ] Basic friend management in user service
- [ ] Validate sharing permissions based on connections
- [ ] Add friend request workflow
- [ ] Implement privacy settings
- [ ] Support group sharing (future)

##### 2. Sharing Analytics

- [ ] Track sharing patterns and statistics
- [ ] Generate sharing reports
- [ ] Monitor popular content
- [ ] User engagement metrics
- [ ] Performance analytics

##### 3. Advanced Share Features

- [ ] Share with message/note
- [ ] Schedule shares for later
- [ ] Share collections/playlists
- [ ] Share reactions and comments
- [ ] Share recommendations

## Database Schema Design

### Share Collection

```javascript
{
  _id: ObjectId,
  mediaId: ObjectId,           // Reference to media-service
  fromUserId: ObjectId,        // Sender (user-service)
  toUserId: ObjectId,          // Recipient (user-service)
  message: String,             // Optional message (max 500 chars)
  status: {
    type: String,
    enum: ['pending', 'watched', 'archived'],
    default: 'pending'
  },
  watchedAt: Date,             // When marked as watched
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Database Indexes

```javascript
// Performance indexes
db.shares.createIndex({ fromUserId: 1, createdAt: -1 });
db.shares.createIndex({ toUserId: 1, status: 1, createdAt: -1 });
db.shares.createIndex({ mediaId: 1 });
db.shares.createIndex({ status: 1, createdAt: -1 });

// Compound indexes for common queries
db.shares.createIndex({ toUserId: 1, status: 1 });
db.shares.createIndex({ fromUserId: 1, status: 1 });
```

## API Specification

### Core Endpoints

```typescript
// Share CRUD Operations
POST   /api/v1/shares
GET    /api/v1/shares/:id
PATCH  /api/v1/shares/:id
DELETE /api/v1/shares/:id

// User-specific Share Queries
GET    /api/v1/shares/sent?status={status}&page={page}
GET    /api/v1/shares/received?status={status}&page={page}
GET    /api/v1/shares/stats

// Health and Monitoring
GET    /health
GET    /ping
```

### Request/Response Examples

#### Create Share

```typescript
POST /api/v1/shares
{
  "mediaId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "toUserId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "message": "Check out this awesome video!"
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "mediaId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "fromUserId": "64f8a1b2c3d4e5f6a7b8c9d3",
    "toUserId": "64f8a1b2c3d4e5f6a7b8c9d1",
    "message": "Check out this awesome video!",
    "status": "pending",
    "createdAt": "2025-09-07T10:30:00Z",
    "updatedAt": "2025-09-07T10:30:00Z"
  }
}
```

#### Mark Share as Watched

```typescript
PATCH /api/v1/shares/64f8a1b2c3d4e5f6a7b8c9d2
{
  "status": "watched"
}

// Response
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "status": "watched",
    "watchedAt": "2025-09-07T11:45:00Z",
    "updatedAt": "2025-09-07T11:45:00Z"
  }
}
```

#### Get Received Shares

```typescript
GET /api/v1/shares/received?status=pending&page=1&limit=20

// Response
{
  "success": true,
  "data": [
    {
      "id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "mediaId": "64f8a1b2c3d4e5f6a7b8c9d0",
      "fromUser": {
        "id": "64f8a1b2c3d4e5f6a7b8c9d3",
        "username": "alice"
      },
      "message": "Check out this awesome video!",
      "status": "pending",
      "createdAt": "2025-09-07T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasNext": false
  }
}
```

## Service Integration Architecture

### Authentication Flow

```
1. User makes request with session cookie
2. Sharing service validates session with user service
3. Extract user ID from validated session
4. Use user ID for share operations
```

### Media Validation Flow

```
1. User attempts to share media item
2. Sharing service validates media exists via media service
3. Create share record with validated media reference
4. Publish share event for other services
```

### Event Publishing

```typescript
// Share events for other services
interface ShareCreatedEvent {
  type: "SHARE_CREATED";
  shareId: string;
  mediaId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  timestamp: Date;
}

interface ShareWatchedEvent {
  type: "SHARE_WATCHED";
  shareId: string;
  mediaId: string;
  userId: string;
  watchedAt: Date;
  timestamp: Date;
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
PORT=8372
BASE_URL=http://localhost:8372
NODE_ENV=development

# Database
MONGO_URL=mongodb://localhost:27017/sharing-service
MONGO_URL_TEST=mongodb://localhost:27017/sharing-service-test

# Service URLs
USER_SERVICE_URL=http://localhost:8583
MEDIA_SERVICE_URL=http://localhost:8584
HOME_SERVICE_URL=http://localhost:7279

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally or connection string
- Access to user and media services
- npm or yarn

### Installation

```bash
cd watchthis-sharing-service
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=8372
BASE_URL=http://localhost:8372
MONGO_URL=mongodb://localhost:27017/sharing-service
USER_SERVICE_URL=http://localhost:8583
MEDIA_SERVICE_URL=http://localhost:8584
NODE_ENV=development
```

### Development

```bash
npm run dev        # Start with hot reloading
npm run build      # Build TypeScript
npm run test       # Run tests
npm run lint       # Check code quality
```

### Testing the API

#### Create a share:

```bash
curl -X POST http://localhost:8372/api/v1/shares \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "toUserId": "64f8a1b2c3d4e5f6a7b8c9d1",
    "message": "Check this out!"
  }'
```

#### Get received shares:

```bash
curl "http://localhost:8372/api/v1/shares/received?status=pending"
```

#### Mark as watched:

```bash
curl -X PATCH http://localhost:8372/api/v1/shares/SHARE_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "watched"}'
```

## Implementation Timeline

### Week 1: Core Foundation

- [x] Service structure and configuration
- [ ] Database schema and models
- [ ] Basic CRUD operations
- [ ] Health endpoints
- [ ] Basic tests

### Week 2: Service Integration

- [ ] User service authentication integration
- [ ] Media service validation
- [ ] Event publishing system
- [ ] Comprehensive test suite
- [ ] Error handling and validation

### Week 3: Home Service Integration

- [ ] Add sharing endpoints to home service
- [ ] Create share creation UI
- [ ] Implement inbox preview
- [ ] Add share status management
- [ ] End-to-end testing

## Success Metrics

### Development Metrics

- [ ] All tests passing with 80%+ coverage
- [ ] API response times < 200ms (95th percentile)
- [ ] Zero critical security vulnerabilities
- [ ] 99%+ uptime during development
- [ ] Successful service integration with user/media services

### MVP Success Criteria

- [ ] Users can successfully share media with other users
- [ ] Share status tracking works correctly (pending → watched)
- [ ] Integration with user authentication is seamless
- [ ] Media validation prevents invalid shares
- [ ] System handles concurrent sharing without conflicts

This implementation plan establishes the sharing service as the critical connector in the WatchThis ecosystem, enabling the core MVP functionality of sharing media between users.
