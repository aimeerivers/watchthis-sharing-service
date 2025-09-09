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
 * Mock the user service to return a successful authentication
 * @param user - The user to authenticate as
 */
export function mockUserServiceAuth(user: { _id: string; username: string }) {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

  nock(userServiceUrl)
    .persist() // Keep the mock active for multiple requests
    .get("/api/v1/session")
    .reply(200, {
      user: {
        _id: user._id,
        username: user.username,
      },
    });
}

/**
 * Mock the user service to return authentication failure
 */
export function mockUserServiceAuthFailure() {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

  nock(userServiceUrl).persist().get("/api/v1/session").reply(401, { error: "Not authenticated" });
}

/**
 * Clear all nock mocks
 */
export function clearUserServiceMocks() {
  nock.cleanAll();
}

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
 * Create a mock session cookie for supertest requests
 */
export function createMockSessionCookie() {
  return "connect.sid=s%3AmockSessionId.mockSignature";
}

/**
 * Helper to make authenticated requests in tests
 */
export function authenticateAs(user: { _id: string; username: string }) {
  mockUserServiceAuth(user);
  return {
    cookie: createMockSessionCookie(),
    user,
  };
}
