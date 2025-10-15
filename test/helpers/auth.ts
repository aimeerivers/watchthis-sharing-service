import crypto from "node:crypto";

import nock from "nock";

// Test user data
export const testUsers = {
  user1: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    username: "testuser1",
  },
  user2: {
    id: "550e8400-e29b-41d4-a716-446655440002",
    username: "testuser2",
  },
  user3: {
    id: "550e8400-e29b-41d4-a716-446655440003",
    username: "testuser3",
  },
};

/**
 * Mock the user service to return a successful JWT authentication
 * @param user - The user to authenticate as
 */
export function mockUserServiceJWTAuth(user: { id: string; username: string }) {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

  nock(userServiceUrl)
    .persist() // Keep the mock active for multiple requests
    .get("/api/v1/auth/me")
    .reply(200, {
      success: true,
      data: {
        user: {
          id: user.id,
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
 * Setup test data - creates UUIDs for consistent testing
 */
export const testData = {
  validMediaId: crypto.randomUUID(),
  validFromUserId: testUsers.user1.id,
  validToUserId: testUsers.user2.id,
  anotherUserId: testUsers.user3.id,
  invalidId: "invalid-id",
  validMessage: "Check out this awesome video!",
};

/**
 * Create a mock JWT token for supertest requests
 */
function createMockJWTToken(user: { id: string; username: string }) {
  // In real implementation, this would be a proper JWT token
  // For testing, we just need a string that our mock will recognize
  return `mock-jwt-token-${user.id}`;
}

/**
 * Helper to make authenticated requests in tests
 */
export function authenticateAs(user: { id: string; username: string }) {
  mockUserServiceJWTAuth(user);
  return {
    token: createMockJWTToken(user),
    authHeader: `Bearer ${createMockJWTToken(user)}`,
    user,
  };
}
