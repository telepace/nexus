import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileForm } from "@/app/customers/components/ProfileForm";
import type { User } from "@/lib/auth";
import type { Sex, EarSize } from "react-nice-avatar";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Upload: ({ className, ...props }: any) => (
    <div data-testid="upload-icon" className={className} {...props} />
  ),
  Edit2: ({ className, ...props }: any) => (
    <div data-testid="edit2-icon" className={className} {...props} />
  ),
  RefreshCw: ({ className, ...props }: any) => (
    <div data-testid="refresh-icon" className={className} {...props} />
  ),
  Palette: ({ className, ...props }: any) => (
    <div data-testid="palette-icon" className={className} {...props} />
  ),
  User: ({ className, ...props }: any) => (
    <div data-testid="user-icon" className={className} {...props} />
  ),
}));

// Mock shadcn/ui components
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    size,
    type,
    disabled,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      className={className}
      type={type}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({
    className,
    onChange,
    value,
    disabled,
    type,
    id,
    ...props
  }: any) => (
    <input
      className={className}
      onChange={onChange}
      value={value}
      disabled={disabled}
      type={type}
      id={id}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="avatar" {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} role="img" {...props} />
  ),
  AvatarFallback: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  ),
}));

// Mock react-nice-avatar
jest.mock("react-nice-avatar", () => ({
  __esModule: true,
  default: function MockNiceAvatar({ config, ...props }: any) {
    return (
      <div
        data-testid="nice-avatar"
        data-config={JSON.stringify(config)}
        {...props}
      >
        MockNiceAvatar
      </div>
    );
  },
  genConfig: jest.fn(() => ({
    sex: "man",
    faceColor: "#F9C9B6",
    earSize: "small",
    eyeStyle: "circle",
    noseStyle: "short",
    mouthStyle: "laugh",
    shirtStyle: "hoody",
    glassesStyle: "none",
    hairColor: "#000",
    hairStyle: "normal",
    hatStyle: "none",
    hatColor: "#000",
    eyeBrowStyle: "up",
    shirtColor: "#9287FF",
    bgColor: "linear-gradient(45deg, #178bff 0%, #ff6868 100%)",
  })),
}));

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

describe("ProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic component structure", () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);

    // Check if the component renders at all
    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("displays user information correctly", () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it('shows "Generate Anime Avatar" button when no anime config exists', () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);

    expect(screen.getByText("Generate Anime Avatar")).toBeInTheDocument();
  });

  it('generates new anime avatar when "Generate Anime Avatar" is clicked', async () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);

    const generateButton = screen.getByText("Generate Anime Avatar");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByTestId("nice-avatar")).toBeInTheDocument();
      expect(screen.getByText("Randomize Avatar")).toBeInTheDocument();
    });
  });

  it("displays anime avatar when anime_avatar_config exists in user", () => {
    const userWithAnimeConfig = {
      ...mockUser,
      anime_avatar_config: {
        sex: "woman" as Sex,
        faceColor: "#F9C9B6",
        earSize: "small" as EarSize,
      },
    };

    render(<ProfileForm user={userWithAnimeConfig} onSubmit={mockOnSubmit} />);

    // Should show anime avatar
    expect(screen.getByTestId("nice-avatar")).toBeInTheDocument();
  });

  it('shows "Randomize Avatar" button when anime config exists', () => {
    const userWithAnimeConfig = {
      ...mockUser,
      anime_avatar_config: {
        sex: "woman" as Sex,
        faceColor: "#F9C9B6",
      },
    };

    render(<ProfileForm user={userWithAnimeConfig} onSubmit={mockOnSubmit} />);

    expect(screen.getByText("Randomize Avatar")).toBeInTheDocument();
  });

  it('randomizes existing anime avatar when "Randomize Avatar" is clicked', async () => {
    const userWithAnimeConfig = {
      ...mockUser,
      anime_avatar_config: {
        sex: "woman" as Sex,
        faceColor: "#F9C9B6",
      },
    };

    render(<ProfileForm user={userWithAnimeConfig} onSubmit={mockOnSubmit} />);

    const randomizeButton = screen.getByText("Randomize Avatar");
    fireEvent.click(randomizeButton);

    await waitFor(() => {
      expect(screen.getByTestId("nice-avatar")).toBeInTheDocument();
    });
  });

  it("includes anime avatar config in form submission", async () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />);

    // Generate anime avatar first
    const generateButton = screen.getByText("Generate Anime Avatar");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByTestId("nice-avatar")).toBeInTheDocument();
    });

    // Edit and save
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        full_name: "John Doe",
        email: "john@example.com",
        anime_avatar_config: expect.any(Object),
      });
    });
  });

  it('switches back to traditional avatar when "Use Traditional Avatar" is clicked', async () => {
    const userWithAnimeConfig = {
      ...mockUser,
      anime_avatar_config: {
        sex: "woman" as Sex,
        faceColor: "#F9C9B6",
      },
    };

    render(<ProfileForm user={userWithAnimeConfig} onSubmit={mockOnSubmit} />);

    // Should start with anime avatar
    expect(screen.getByTestId("nice-avatar")).toBeInTheDocument();

    const traditionalButton = screen.getByText("Use Traditional Avatar");
    fireEvent.click(traditionalButton);

    await waitFor(() => {
      // Should switch back to traditional avatar
      const avatarImage = screen.getByRole("img");
      expect(avatarImage).toHaveAttribute(
        "src",
        "https://example.com/avatar.jpg",
      );
      expect(screen.getByText("Generate Anime Avatar")).toBeInTheDocument();
    });
  });
});
