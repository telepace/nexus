import { login } from "@/components/actions/login-action";
import { authJwtLogin } from "@/app/clientService";
import { cookies } from "next/headers";

jest.mock("../app/clientService", () => ({
  authJwtLogin: jest.fn(),
}));

jest.mock("next/headers", () => {
  const mockSet = jest.fn();
  return { cookies: jest.fn().mockResolvedValue({ set: mockSet }) };
});

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock the encryption function to return a predictable result
jest.mock("../lib/encryption", () => ({
  encryptPassword: jest.fn((password: string) => `encrypted_${password}`),
}));

describe("login action", () => {
  it("should call login service action with the correct input", async () => {
    const formData = new FormData();
    formData.set("username", "a@a.com");
    formData.set("password", "Q12341414#");

    const mockSet = (await cookies()).set;

    // Mock a successful login
    (authJwtLogin as jest.Mock).mockResolvedValue({
      data: { access_token: "1245token" },
    });

    await login({}, formData);

    expect(authJwtLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          username: "a@a.com",
          password: "encrypted_Q12341414#",
          grant_type: "password",
          client_id: "",
          client_secret: "",
          scope: "",
        }),
      }),
    );

    expect(cookies).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith("accessToken", "1245token", {
      httpOnly: true,
      secure: false, // process.env.NODE_ENV is 'test' during jest runs
      maxAge: 60 * 60 * 24 * 7, // 604800
      path: "/",
    });
  });

  it("should should return an error if the server validation fails", async () => {
    const formData = new FormData();
    formData.set("username", "invalid@invalid.com");
    formData.set("password", "Q12341414#");

    // Mock a failed login
    (authJwtLogin as jest.Mock).mockResolvedValue({
      error: {
        detail: "LOGIN_BAD_CREDENTIALS",
      },
    });

    const result = await login(undefined, formData);

    expect(authJwtLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          username: "invalid@invalid.com",
          password: "encrypted_Q12341414#",
          grant_type: "password",
          client_id: "",
          client_secret: "",
          scope: "",
        }),
      }),
    );

    expect(result).toEqual({
      server_validation_error: "LOGIN_BAD_CREDENTIALS",
    });

    expect(cookies).not.toHaveBeenCalled();
  });

  it("should should return an error if either the password or username is not sent", async () => {
    const formData = new FormData();
    formData.set("username", "");
    formData.set("password", "");

    const result = await login({}, formData);

    expect(authJwtLogin).not.toHaveBeenCalledWith();

    expect(result).toEqual({
      errors: {
        password: ["Password is required"],
        username: ["Email is required"],
      },
    });

    expect(cookies).not.toHaveBeenCalled();
  });

  it("should handle unexpected errors and return server error message", async () => {
    // Mock the authJwtLogin to throw an error
    const mockError = new Error("Network error");
    (authJwtLogin as jest.Mock).mockRejectedValue(mockError);

    const formData = new FormData();
    formData.append("username", "testuser");
    formData.append("password", "password123");

    const result = await login(undefined, formData);

    expect(result).toEqual({
      server_error: "An unexpected error occurred. Please try again later.",
    });
  });
});
