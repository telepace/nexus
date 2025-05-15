import "@testing-library/jest-dom";

// Mock motion components
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock useAuth
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "123",
      full_name: "Test User",
      email: "test@example.com",
      is_active: true,
      is_superuser: false,
      created_at: "2023-01-01T00:00:00.000Z",
    },
    updateUser: jest.fn(),
  }),
}));

// Mock useToast
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));
