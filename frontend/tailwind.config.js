/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.css", // Include CSS modules for dark mode classes
  ],
  safelist: [
    // Dark mode colors used in CSS modules
    "dark:border-gray-700",
    "dark:bg-gray-950",
    "dark:border-gray-600",
    "dark:bg-gradient-to-br",
    "dark:from-gray-800",
    "dark:to-gray-700",
    "dark:border-blue-600",
    "dark:border-red-600",
    "dark:hover:border-gray-700",
    "dark:bg-gradient-to-r",
    "dark:from-gray-800",
    "dark:via-transparent",
    "dark:to-gray-700",
    "dark:from-gray-950",
    "dark:via-gray-950",
    "dark:to-transparent",
    "dark:from-transparent",
    "dark:via-white",
    "dark:shadow-blue-500",
    "dark:bg-gray-800",
    "dark:hover:bg-gray-700",
    "dark:bg-blue-950",
    "dark:border-blue-800",
    "dark:text-blue-400",
    "dark:bg-blue-900",
    "dark:border-blue-700",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // 日式极简美学色彩系统
        library: {
          bg: "#ffffff",
          border: "rgba(0, 0, 0, 0.06)",
          "border-hover": "rgba(0, 0, 0, 0.12)",
          text: "#000000",
          "text-muted": "#666666",
          "text-subtle": "#999999",
          "tag-bg": "rgba(0, 0, 0, 0.04)",
          "tag-bg-hover": "rgba(0, 0, 0, 0.08)",
        },
      },
      screens: {
        xs: "475px", // 额外的小屏幕断点
        "3xl": "1920px", // 额外的大屏幕断点
        // 容器查询断点
        "@container": {
          xs: "20rem",
          sm: "24rem",
          md: "28rem",
          lg: "32rem",
          xl: "36rem",
          "2xl": "42rem",
        },
      },
      width: {
        library: "35.25rem", // 564px - content-library左栏宽度
        "library-lg": "37.5rem", // 600px - 2xl屏幕下的左栏宽度
        "library-xl": "39.75rem", // 636px - 3xl屏幕下的左栏宽度
        cardTitle: "18rem", // 卡片标题最大宽度
        // 响应式容器宽度
        "container-xs": "min(100%, 475px)",
        "container-sm": "min(100%, 640px)",
        "container-md": "min(100%, 768px)",
        "container-lg": "min(100%, 1024px)",
        "container-xl": "min(100%, 1280px)",
      },
      maxWidth: {
        prose: "65ch", // 优化阅读宽度
        "screen-xs": "475px",
        "screen-2xl": "1536px",
        // 动态最大宽度
        "dialog-mobile": "100vw",
        "dialog-desktop": "90vw",
      },
      minWidth: {
        dialog: "320px", // 最小对话框宽度
        sidebar: "240px", // 最小侧边栏宽度
        content: "280px", // 最小内容区域宽度
      },
      height: {
        header: "3.5rem", // 56px - 页面头部高度
        "dialog-mobile": "100vh",
        "dialog-desktop": "90vh",
        "screen-safe": "100dvh", // 动态视口高度
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "linear-bg-2":
          "linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--background)), hsl(var(--muted)))",
      },
      boxShadow: {
        "macos-window":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "dialog-mobile": "0 0 0 1px rgba(0, 0, 0, 0.05)",
        "dialog-desktop":
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      // 添加无滚动条的工具类
      utilities: {
        ".no-scrollbar": {
          /* Hide scrollbar for Chrome, Safari and Opera */
          "&::-webkit-scrollbar": {
            display: "none",
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          "-ms-overflow-style": "none" /* IE and Edge */,
          "scrollbar-width": "none" /* Firefox */,
        },
        ".safe-area-inset": {
          "padding-top": "env(safe-area-inset-top)",
          "padding-bottom": "env(safe-area-inset-bottom)",
          "padding-left": "env(safe-area-inset-left)",
          "padding-right": "env(safe-area-inset-right)",
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
    // 添加自定义工具类插件
    function ({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        ".no-scrollbar": {
          /* Hide scrollbar for Chrome, Safari and Opera */
          "&::-webkit-scrollbar": {
            display: "none",
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          "-ms-overflow-style": "none" /* IE and Edge */,
          "scrollbar-width": "none" /* Firefox */,
        },
        ".safe-area-inset": {
          "padding-top": "env(safe-area-inset-top)",
          "padding-bottom": "env(safe-area-inset-bottom)",
          "padding-left": "env(safe-area-inset-left)",
          "padding-right": "env(safe-area-inset-right)",
        },
        ".overflow-safe": {
          overflow: "auto",
          "overscroll-behavior": "contain",
        },
        // 响应式容器工具类
        ".container-responsive": {
          width: "100%",
          "max-width": "100%",
          "margin-left": "auto",
          "margin-right": "auto",
          "padding-left": "1rem",
          "padding-right": "1rem",
          "@media (min-width: 640px)": {
            "max-width": "640px",
          },
          "@media (min-width: 768px)": {
            "max-width": "768px",
          },
          "@media (min-width: 1024px)": {
            "max-width": "1024px",
          },
          "@media (min-width: 1280px)": {
            "max-width": "1280px",
          },
        },
        // 响应式文本大小
        ".text-responsive": {
          "font-size": "clamp(0.875rem, 2.5vw, 1rem)",
          "line-height": "1.5",
        },
        ".text-responsive-lg": {
          "font-size": "clamp(1rem, 3vw, 1.25rem)",
          "line-height": "1.4",
        },
        // 优化悬浮效果的工具类
        ".hover-optimized": {
          "will-change": "transform, opacity, background-color",
          "transition-property":
            "transform, opacity, background-color, border-color, box-shadow",
          "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
          "transition-duration": "200ms",
        },
        ".hover-subtle": {
          "&:hover": {
            "background-color": "hsl(var(--muted) / 0.3)",
            "border-color": "hsl(var(--muted-foreground) / 0.1)",
          },
        },
        ".hover-medium": {
          "&:hover": {
            "background-color": "hsl(var(--muted) / 0.5)",
            "border-color": "hsl(var(--muted-foreground) / 0.2)",
            "box-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          },
        },
        ".hover-strong": {
          "&:hover": {
            "background-color": "hsl(var(--muted) / 0.7)",
            "border-color": "hsl(var(--muted-foreground) / 0.3)",
            "box-shadow":
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            transform: "scale(1.01)",
          },
        },
      };

      const newComponents = {
        ".dialog-responsive": {
          position: "fixed",
          inset: "0",
          "z-index": "50",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          padding: "1rem",
          "@media (max-width: 768px)": {
            padding: "0",
            "align-items": "flex-end",
          },
        },
        ".panel-split": {
          display: "flex",
          height: "100vh",
          "@media (max-width: 768px)": {
            "flex-direction": "column",
          },
        },
        ".panel-responsive": {
          flex: "1",
          "min-width": "0",
          overflow: "auto",
          "@media (max-width: 768px)": {
            height: "50vh",
          },
        },
      };

      addUtilities(newUtilities);
      addComponents(newComponents);
    },
  ],
};
