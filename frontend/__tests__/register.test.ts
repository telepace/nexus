import { register } from "@/components/actions/register-action";
import { redirect } from "next/navigation";
import { registerUser } from "@/app/clientService";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("../app/clientService", () => ({
  registerUser: jest.fn(),
}));

describe("register action", () => {
  it("should call register service action with the correct input", async () => {
    const formData = new FormData();
    formData.set("email", "a@a.com");
    formData.set("password", "Q12341414#");

    // Mock a successful register
    (registerUser as jest.Mock).mockResolvedValue({});

    await register({}, formData);

    expect(registerUser).toHaveBeenCalledWith({
      body: {
        email: "a@a.com",
        password: "Q12341414#",
        full_name: null,
      },
    });

    expect(redirect).toHaveBeenCalled();
  });
  it("should should return an error if the server call fails", async () => {
    const formData = new FormData();
    formData.set("email", "a@a.com");
    formData.set("password", "Q12341414#");

    // Mock a failed register
    (registerUser as jest.Mock).mockResolvedValue({
      error: {
        detail: "REGISTER_USER_ALREADY_EXISTS",
      },
    });

    const result = await register({}, formData);

    expect(registerUser).toHaveBeenCalledWith({
      body: {
        email: "a@a.com",
        password: "Q12341414#",
        full_name: null,
      },
    });
    expect(result).toEqual({
      server_validation_error: "REGISTER_USER_ALREADY_EXISTS",
    });
  });

  it("should return an validation error if the form is invalid", async () => {
    const formData = new FormData();
    formData.set("email", "email");
    formData.set("password", "invalid_password");

    const result = await register({}, formData);

    expect(result).toEqual({
      errors: {
        email: ["Invalid email"],
        password: ["Password should be at least 8 characters."],
      },
    });
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("should handle unexpected errors and return server error message", async () => {
    // Mock the registerUser to throw an error
    const mockError = new Error("Network error");
    (registerUser as jest.Mock).mockRejectedValue(mockError);

    const formData = new FormData();
    formData.append("email", "testuser@example.com");
    formData.append("password", "Password123#");

    const result = await register(undefined, formData);

    expect(result).toEqual({
      server_error: "An unexpected error occurred. Please try again later.",
    });
  });
});
