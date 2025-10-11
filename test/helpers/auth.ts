import mongoose from "mongoose";
import nock from "nock";

// Test user data
export const testUsers = {
  user1: {
    _id: "507f1f77bcf86cd799439011",
    username: "testuser1",
  },
  user2: {
    _id: "507f1f77bcf86cd799439012",
    username: "testuser2",
  },
  user3: {
    _id: "507f1f77bcf86cd799439013",
    username: "testuser3",
  },
};

/**
 * Mock the user service to return a successful JWT authentication
 * @param user - The user to authenticate as
 */
export function mockUserServiceJWTAuth(user: { _id: string; username: string }) {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

  nock(userServiceUrl)
    .persist() // Keep the mock active for multiple requests
    .get("/api/v1/auth/me")
    .reply(200, {
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
        },
      },
    });
}

/**
 * Mock the user service to return JWT authentication failure
 */
export function mockUserServiceJWTAuthFailure() {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

  nock(userServiceUrl)
    .persist()
    .get("/api/v1/auth/me")
    .reply(401, {
      success: false,
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
    });
}

/**
 * Clear all nock mocks
 */
export function clearUserServiceMocks() {
  nock.cleanAll();
}

// Backward compatibility aliases
export const mockUserServiceAuth = mockUserServiceJWTAuth;
export const mockUserServiceAuthFailure = mockUserServiceJWTAuthFailure;

/**
 * Setup test data - creates ObjectIds for consistent testing
 */
export const testData = {
  validMediaId: new mongoose.Types.ObjectId(),
  validFromUserId: new mongoose.Types.ObjectId(testUsers.user1._id),
  validToUserId: new mongoose.Types.ObjectId(testUsers.user2._id),
  anotherUserId: new mongoose.Types.ObjectId(testUsers.user3._id),
  invalidId: "invalid-id",
  validMessage: "Check out this awesome video!",
};

/**
 * Create a mock JWT token for supertest requests
 */
function createMockJWTToken(user: { _id: string; username: string }) {
  // In real implementation, this would be a proper JWT token
  // For testing, we just need a string that our mock will recognize
  return `mock-jwt-token-${user._id}`;
}

/**
 * Helper to make authenticated requests in tests
 */
export function authenticateAs(user: { _id: string; username: string }) {
  mockUserServiceJWTAuth(user);
  return {
    token: createMockJWTToken(user),
    authHeader: `Bearer ${createMockJWTToken(user)}`,
    user,
  };
}
