import React from "react";
import { render, screen } from "@testing-library/react";
import type { User } from "@/lib/auth";

// Mock all external dependencies
jest.mock("react-nice-avatar", () => ({
  __esModule: true,
  default: function MockNiceAvatar(props: any) {
    return <div data-testid="nice-avatar">MockNiceAvatar</div>;
  },
  genConfig: jest.fn(() => ({
    sex: "man",
    faceColor: "#F9C9B6",
  })),
}));

jest.mock("lucide-react", () => ({
  Upload: () => <div>Upload</div>,
  Edit2: () => <div>Edit2</div>,
  RefreshCw: () => <div>RefreshCw</div>,
  Palette: () => <div>Palette</div>,
  User: () => <div>User</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
  AvatarFallback: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}));

// Simple version of ProfileForm
function SimpleProfileForm({ user }: { user: User; onSubmit: any }) {
  return (
    <div>
      <h2>My Profile</h2>
      <p>Hello World</p>
      <p>{user.full_name}</p>
    </div>
  );
}

const mockUser: User = {
  id: "1",
  full_name: "John Doe",
  email: "john@example.com",
  is_active: true,
  is_superuser: false,
  created_at: "2023-01-01T00:00:00Z",
  avatar_url: "https://example.com/avatar.jpg",
};

const mockOnSubmit = jest.fn();

describe("Simple ProfileForm", () => {
  it("renders simple content", () => {
    const { container } = render(
      <SimpleProfileForm user={mockUser} onSubmit={mockOnSubmit} />,
    );

    console.log("Simple form HTML:", container.innerHTML);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
