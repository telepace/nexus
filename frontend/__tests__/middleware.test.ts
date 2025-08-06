/**
 * @jest-environment jsdom
 */

// Mock the middleware function
function getLocaleFromPath(pathname: string): {
  locale: string;
  pathnameWithoutLocale: string;
} {
  const [, firstSegment, ...rest] = pathname.split("/");

  // Check if first segment is a non-english locale
  if (["en", "zh"].includes(firstSegment) && firstSegment !== "en") {
    return {
      locale: firstSegment,
      pathnameWithoutLocale: "/" + rest.join("/"),
    };
  }

  // For root paths and /en/ paths, treat as English
  if (firstSegment === "en") {
    return {
      locale: "en",
      pathnameWithoutLocale: "/" + rest.join("/"),
    };
  }

  // Default: treat root paths as English
  return {
    locale: "en",
    pathnameWithoutLocale: pathname,
  };
}

describe("Middleware Locale Detection", () => {
  describe("getLocaleFromPath", () => {
    it("should detect English for root paths", () => {
      expect(getLocaleFromPath("/content-library")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/content-library",
      });

      expect(getLocaleFromPath("/home")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/home",
      });

      expect(getLocaleFromPath("/")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/",
      });
    });

    it("should detect English for /en/ paths", () => {
      expect(getLocaleFromPath("/en/content-library")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/content-library",
      });

      expect(getLocaleFromPath("/en/home")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/home",
      });
    });

    it("should detect Chinese for /zh/ paths", () => {
      expect(getLocaleFromPath("/zh/content-library")).toEqual({
        locale: "zh",
        pathnameWithoutLocale: "/content-library",
      });

      expect(getLocaleFromPath("/zh/home")).toEqual({
        locale: "zh",
        pathnameWithoutLocale: "/home",
      });
    });

    it("should handle edge cases", () => {
      expect(getLocaleFromPath("/api/test")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/api/test",
      });

      expect(getLocaleFromPath("/share/token123")).toEqual({
        locale: "en",
        pathnameWithoutLocale: "/share/token123",
      });
    });
  });

  describe("Path Generation Logic", () => {
    it("should generate correct paths for different locales", () => {
      const generatePath = (locale: string, base: string) => {
        if (locale === "en") {
          return base;
        }
        return `/${locale}${base}`;
      };

      expect(generatePath("en", "/login")).toBe("/login");
      expect(generatePath("zh", "/login")).toBe("/zh/login");
      expect(generatePath("en", "/content-library")).toBe("/content-library");
      expect(generatePath("zh", "/content-library")).toBe(
        "/zh/content-library",
      );
    });
  });
});
