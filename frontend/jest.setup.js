import "@testing-library/jest-dom";
import React from "react";

// Add fetch mock for tests
global.fetch = jest.fn().mockImplementation((input, init) => {
  // Basic mock data
  const body = JSON.stringify({ access_token: "fake-token" });
  let _bodyUsed = false;
  const headers = {
    get: jest.fn(() => null),
    has: jest.fn(() => false),
    entries: jest.fn(() => [].entries()),
    keys: jest.fn(() => [].keys()),
    values: jest.fn(() => [].values()),
    forEach: jest.fn(),
    append: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
  };
  const response = {
    ok: true,
    status: 200,
    statusText: "OK",
    url: typeof input === "string" ? input : (input && input.url) || "",
    redirected: false,
    type: "basic",
    headers,
    body: null,
    bodyUsed: false,
    json: jest.fn(() => {
      response.bodyUsed = true;
      return Promise.resolve({ access_token: "fake-token" });
    }),
    text: jest.fn(() => {
      response.bodyUsed = true;
      return Promise.resolve(body);
    }),
    clone: jest.fn(() => ({ ...response })),
    // Optionally add more methods as needed
    // arrayBuffer, blob, formData, etc.
  };
  return Promise.resolve(response);
});

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actualFramerMotion = jest.requireActual("framer-motion");
  return {
    ...actualFramerMotion,
    AnimatePresence: jest.fn(({ children }) => <>{children}</>),
    motion: new Proxy(
      {},
      {
        get: (target, prop) => {
          // For motion.div, motion.span, etc.
          return jest.fn(({ children, ...rest }) => {
            const Component = prop; // e.g., 'div'
            try {
              // @ts-expect-error - type is dynamic
              return <Component {...rest}>{children}</Component>;
            } catch (_) {
              // Fallback for custom components
              return (
                <div data-testid={`mock-motion-${String(prop)}`} {...rest}>
                  {children}
                </div>
              );
            }
          });
        },
      },
    ),
    useAnimate: () => [null, jest.fn()],
    useInView: () => true,
    useScroll: () => ({
      scrollYProgress: { onChange: jest.fn(), get: () => 0 },
    }),
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
    pathname: "/test-path",
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
  notFound: jest.fn(),
}));

// Mock console.error to handle expected errors during testing
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected errors and warnings
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("LOGIN_BAD_CREDENTIALS") ||
      args[0].includes("Login API error:") ||
      args[0].includes("Login error:") ||
      args[0].includes("Registration error:") ||
      args[0].includes(
        "Warning: An update to Root inside a test was not wrapped in act",
      ) ||
      args[0].includes("Warning: It looks like you're using the wrong act()") ||
      args[0].includes(
        "act(...) is not supported in production builds of React",
      ))
  ) {
    return; // Suppress expected login credential errors, registration errors and act warnings
  }
  originalConsoleError(...args);
};

// Intercept debug logs
const originalConsoleDebug = console.debug;
console.debug = (...args) => {
  // Disable all debug logs during testing
  // originalConsoleDebug(...args);
};

// Mock auth hooks
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn().mockReturnValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      token: "fake-test-token",
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
jest.mock("react", () => {
  const actualReact = jest.requireActual("react");
  return {
    ...actualReact,
    useActionState: jest.fn(() => [null, jest.fn()]),
    act: (callback) => {
      // Ensure to use actualReact.act for proper execution
      return actualReact.act(callback);
    },
    cache: (fn) => fn,
    experimental_useOptimistic: jest.fn(() => [null, jest.fn()]),
    useFormStatus: jest.fn(() => ({ pending: false })),
    useFormState: jest.fn((action, initialState) => [initialState, jest.fn()]),
    useTransition: jest.fn(() => [false, jest.fn()]),
  };
});

// Mock clientService to fix 'authJwtLogin' tests
jest.mock("@/app/clientService", () => ({
  authJwtLogin: jest
    .fn()
    .mockResolvedValue({ data: { access_token: "test-token" } }),
}));

// Mock useToast
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Additional log filtering
jest.spyOn(console, "log").mockImplementation((...args) => {
  // Filter out debug info if DEBUG env variable not set
  if (!process.env.DEBUG) {
    if (
      args[0] &&
      typeof args[0] === "string" &&
      (args[0].includes("emittery") ||
        args[0].includes("[data:") ||
        args[0].includes("[Customer]") ||
        args[0].match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/))
    ) {
      return;
    }
  }
  process.stdout.write(args.join(" ") + "\n");
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  delete global.mockSearchParams;
  delete global.mockPathname;
});
