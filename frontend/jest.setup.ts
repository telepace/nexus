import "@testing-library/jest-dom";
import React from "react";

// Add TextEncoder and TextDecoder polyfill for Jest
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add Request polyfill for Jest
global.Request = class MockRequest {
  constructor(input: any, init?: any) {
    this.url = typeof input === "string" ? input : input.url;
    this.method = init?.method || "GET";
    this.headers = new Headers(init?.headers);
    this.body = init?.body;
  }
  url: string;
  method: string;
  headers: Headers;
  body: any;
} as any;

// Store the original location object
const originalLocation = window.location;

beforeAll(() => {
  delete (window as any).location;
  (window as any).location = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(originalLocation),
      assign: {
        configurable: true,
        value: jest.fn(),
      },
      reload: {
        configurable: true,
        value: jest.fn(),
      },
      replace: {
        configurable: true,
        value: jest.fn(),
      },
      href: {
        configurable: true,
        writable: true,
        value: "http://localhost:3000",
      },
      origin: {
        configurable: true,
        writable: true,
        value: "http://localhost:3000",
      },
      pathname: {
        configurable: true,
        writable: true,
        value: "/",
      },
      search: {
        configurable: true,
        writable: true,
        value: "",
      },
      hash: {
        configurable: true,
        writable: true,
        value: "",
      },
    },
  );
});

afterAll(() => {
  // Restore the original window.location object
  (window as any).location = originalLocation;
});

beforeEach(() => {
  // Reset location before each test
  (window as any).location.href = "http://localhost:3000";
  (window as any).location.pathname = "/";
  (window as any).location.search = "";
  (window as any).location.hash = "";
});

// Mock IntersectionObserver
(global as any).IntersectionObserver = class MockIntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  root = null;
  rootMargin = "";
  thresholds = [];
  takeRecords() {
    return [];
  }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, "scrollTo", {
  value: jest.fn(),
  writable: true,
});

// Mock next/router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actualFramerMotion = jest.requireActual("framer-motion");
  return {
    ...actualFramerMotion,
    AnimatePresence: jest.fn(({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ),
    motion: new Proxy(
      {},
      {
        get: (target, prop) => {
          // For motion.div, motion.span, etc.
          return jest.fn(
            ({
              children,
              ...rest
            }: { children?: React.ReactNode; [key: string]: any }) => {
              const Component = prop as keyof React.JSX.IntrinsicElements; // e.g., 'div'
              try {
                return React.createElement(Component, rest, children);
              } catch (_) {
                // Fallback for custom components
                return React.createElement(
                  "div",
                  { "data-testid": `mock-motion-${String(prop)}`, ...rest },
                  children,
                );
              }
            },
          );
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
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
  redirect: jest.fn(),
}));

// Mock client-auth module
jest.mock("@/lib/client-auth", () => ({
  getCookie: jest.fn((name: string) => {
    // Return a mock token for accessToken
    if (name === "accessToken") {
      return "mock-access-token-for-testing";
    }
    return undefined;
  }),
  useAuth: jest.fn(() => ({
    user: null,
    isLoading: false,
    error: null,
    updateUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    setCustomToken: jest.fn(),
    fetchUser: jest.fn(),
  })),
}));

// Mock server-auth-bridge module
jest.mock("@/lib/server-auth-bridge", () => ({
  requireAuth: jest.fn(() =>
    Promise.resolve({
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User",
    }),
  ),
  getAuthToken: jest.fn(() => Promise.resolve("test-auth-token-12345")),
}));

// Mock server-auth module
jest.mock("@/lib/server-auth", () => ({
  requireAuth: jest.fn(() =>
    Promise.resolve({
      id: "test-user-id",
      email: "test@example.com",
      full_name: "Test User",
    }),
  ),
  getAuthToken: jest.fn(() => Promise.resolve("test-auth-token-12345")),
}));

// Mock Next.js cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  cache: jest.fn((fn) => fn), // Just return the function as-is for testing
}));

// Mock OpenAPI client
jest.mock("@/app/openapi-client/index", () => ({
  contentListContentItemsEndpoint: jest.fn(),
  contentGetContentItemEndpoint: jest.fn(),
  itemsDeleteItem: jest.fn(),
  itemsCreateItem: jest.fn(),
}));

// Mock OpenAPI SDK
jest.mock("@/app/openapi-client/sdk.gen", () => ({
  contentListContentItemsEndpoint: jest.fn(() => Promise.resolve([])),
  contentGetContentItemEndpoint: jest.fn(() => Promise.resolve(null)),
  itemsDeleteItem: jest.fn(() => Promise.resolve({ success: true })),
  itemsCreateItem: jest.fn(() => Promise.resolve({ id: "test-id" })),
}));

// Mock items-action-client module
jest.mock("@/components/actions/items-action-client", () => ({
  fetchItems: jest.fn(() => Promise.resolve([])), // 默认返回空数组
}));

// Add fetch mock for tests
global.fetch = jest
  .fn()
  .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    // Basic mock data
    const body = JSON.stringify({ access_token: "fake-token" });
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
      url:
        typeof input === "string"
          ? input
          : (input && (input as Request).url) || "",
      redirected: false,
      type: "basic" as ResponseType,
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
    return Promise.resolve(response as Response);
  });

// Mock console.error to handle expected errors during testing
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
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
console.debug = (...args: any[]) => {
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
    useActionState: jest.fn((action: any, initialState: any) => {
      // The dispatch function returned by useActionState, when called, should invoke the action.
      // We also need a way to simulate the state update if tests depend on it,
      // but for now, just calling the action is the priority.
      const dispatch = jest.fn(async (...args: any[]) => {
        // Call the actual action function that was passed to useActionState
        if (typeof action === "function") {
          return action(...args);
        }
      });
      return [initialState, dispatch]; // Return initial state and our spy dispatch
    }),
    act: (callback: () => void) => {
      // Ensure to use actualReact.act for proper execution
      return actualReact.act(callback);
    },
    cache: (fn: any) => fn,
    experimental_useOptimistic: jest.fn(() => [null, jest.fn()]),
    useFormStatus: jest.fn(() => ({ pending: false })),
    useFormState: jest.fn((action: any, initialState: any) => [
      initialState,
      jest.fn(),
    ]),
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
jest.spyOn(console, "log").mockImplementation((...args: any[]) => {
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
  delete (global as any).mockSearchParams;
  delete (global as any).mockPathname;
});

// Mock react-markdown and related packages
jest.mock("react-markdown", () => {
  const React = require("react");
  return function ReactMarkdown({ children }: { children: string }) {
    return React.createElement(
      "div",
      { "data-testid": "react-markdown" },
      children,
    );
  };
});

jest.mock("remark-gfm", () => () => {});
jest.mock("remark-breaks", () => () => {});
jest.mock("rehype-highlight", () => () => {});
jest.mock("rehype-raw", () => () => {});

// Mock sonner toast library
jest.mock("sonner", () => {
  const React = require("react");
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      loading: jest.fn(),
      dismiss: jest.fn(),
    },
    Toaster: jest.fn(({ ...props }) => {
      return React.createElement("div", {
        "data-testid": "mock-toaster",
        ...props,
      });
    }),
  };
});

// Mock remark-toc
jest.mock("remark-toc", () => () => {});

// Mock rehype-autolink-headings and other rehype plugins
jest.mock("rehype-autolink-headings", () => () => {});

// Mock all remark and rehype related modules
jest.mock("remark-math", () => () => {});
jest.mock("rehype-katex", () => () => {});

// Mock medium-zoom
jest.mock("medium-zoom", () => {
  const mockZoom = jest.fn();
  const mockDetach = jest.fn();
  // Mock the default export and the detach method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mz = mockZoom as any;
  mz.detach = mockDetach;
  return mz;
});

// Mock copy-to-clipboard
jest.mock("copy-to-clipboard", () => jest.fn());
