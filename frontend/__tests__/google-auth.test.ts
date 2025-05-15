/**
 * @jest-environment node
 */

import { createMocks } from "node-mocks-http";
import { GET as googleAuthGET } from "../app/api/auth/google/route";
import { GET as googleCallbackGET } from "../app/api/auth/google/callback/route";

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation((name: string) => {
      if (name === "google_oauth_state") {
        return { value: "test-state" };
      }
      return null;
    }),
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock console.error and console.log to keep tests clean
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe("Google OAuth Routes", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/auth/google", () => {
    it("should redirect to Google authorization URL", async () => {
      const { req, res } = createMocks({
        method: "GET",
      });

      const response = await googleAuthGET();

      expect(response.status).toBe(302); // Redirect status
      const redirectUrl = response.headers.get("location");
      expect(redirectUrl).toContain(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(redirectUrl).toContain("client_id=test-client-id");
      expect(redirectUrl).toContain(
        "redirect_uri=http://localhost:3000/api/auth/google/callback",
      );
    });

    it("should return error response if client ID is missing", async () => {
      process.env.GOOGLE_CLIENT_ID = "";

      const { req, res } = createMocks({
        method: "GET",
      });

      const response = await googleAuthGET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("OAuth configuration error");
    });
  });

  describe("GET /api/auth/google/callback", () => {
    it("should handle error parameter", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          error: "access_denied",
        },
        url: "http://localhost:3000/api/auth/google/callback",
      });

      const response = await googleCallbackGET({
        nextUrl: {
          searchParams: new URLSearchParams("error=access_denied"),
        },
        url: "http://localhost:3000/api/auth/google/callback",
      } as any);

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/login?error=oauth_error");
    });

    it("should validate state parameter", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          code: "test-code",
          state: "invalid-state",
        },
        url: "http://localhost:3000/api/auth/google/callback",
      });

      const response = await googleCallbackGET({
        nextUrl: {
          searchParams: new URLSearchParams(
            "code=test-code&state=invalid-state",
          ),
        },
        url: "http://localhost:3000/api/auth/google/callback",
      } as any);

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/login?error=invalid_state");
    });
  });
});
