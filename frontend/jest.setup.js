import "@testing-library/jest-dom";
import React from "react";

// Add fetch mock for tests
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ access_token: "fake-token" }),
    status: 200,
  })
);

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actualFramerMotion = jest.requireActual("framer-motion");
  return {
    ...actualFramerMotion,
    AnimatePresence: jest.fn(({ children }) => <>{children}</>),
    motion: new Proxy({}, {
      get: (target, prop) => {
        // For motion.div, motion.span, etc.
        return jest.fn(({ children, ...rest }) => {
          const Component = prop; // e.g., 'div'
          try {
            // @ts-expect-error - type is dynamic
            return <Component {...rest}>{children}</Component>;
          } catch (_) {
            // Fallback for custom components
            return <div data-testid={`mock-motion-${String(prop)}`} {...rest}>{children}</div>;
          }
        });
      }
    }),
    useAnimate: () => [null, jest.fn()],
    useInView: () => true,
    useScroll: () => ({
      scrollYProgress: { onChange: jest.fn(), get: () => 0 },
    })
  };
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn((param) => {
      // 根据参数名返回适当的值
      if (param === "step") return "1";
      if (param === "plugin_id") return null;
      if (param === "extension_callback") return null;
      return null;
    }),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
    forEach: jest.fn(),
    entries: jest.fn(() => [].entries()),
    keys: jest.fn(() => [].keys()),
    values: jest.fn(() => [].values()),
    toString: jest.fn(() => ""),
  }),
  usePathname: () => "/",
  redirect: jest.fn(),
}));

// Mock console.error to handle expected errors during testing
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only suppress LOGIN_BAD_CREDENTIALS error logs
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('LOGIN_BAD_CREDENTIALS')
  ) {
    return; // Suppress expected login credential errors
  }
  originalConsoleError(...args);
};

// Intercept debug logs
const originalConsoleDebug = console.debug;
console.debug = (...args) => {
  // Uncomment to see debug logs during testing
  // originalConsoleDebug(...args);
};

// Mock auth hooks
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { 
      id: "test-user-id",
      email: "test@example.com",
      token: "fake-test-token"
    },
    isLoading: false,
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock google auth action
jest.mock("@/components/actions/google-auth-action", () => ({
  initiateGoogleLogin: jest.fn(),
}));

// Mock extension utilities
jest.mock("@/lib/extension-utils", () => ({
  getExtensionPluginId: jest.fn().mockResolvedValue("test-plugin-id"),
  saveTokenToExtension: jest.fn().mockResolvedValue(true),
  isExtensionInstalled: jest.fn().mockResolvedValue(true),
  openExtensionTab: jest.fn().mockResolvedValue(true),
  openSidepanel: jest.fn().mockResolvedValue(true),
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(() => []),
    keys: jest.fn(() => []),
    values: jest.fn(() => []),
    forEach: jest.fn(),
  })),
}));

// Mock React's useActionState
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useActionState: jest.fn(() => [null, jest.fn()]),
  };
});

// Mock clientService to fix 'authJwtLogin' tests
jest.mock("@/app/clientService", () => ({
  authJwtLogin: jest.fn().mockResolvedValue({ data: { access_token: 'test-token' } }),
}));

// Mock useToast
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Additional log filtering
jest.spyOn(console, 'log').mockImplementation((...args) => {
  // Filter out debug info if DEBUG env variable not set
  if (!process.env.DEBUG) {
    if (
      args[0] && 
      typeof args[0] === 'string' && 
      (
        args[0].includes('emittery') ||
        args[0].includes('[data:') ||
        args[0].includes('[Customer]') ||
        args[0].match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)
      )
    ) {
      return;
    }
  }
  process.stdout.write(args.join(' ') + '\n');
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  delete global.mockSearchParams;
  delete global.mockPathname;
});
