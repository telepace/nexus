/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      width: {
        'library': '35.25rem',     // 564px - content-library左栏宽度
        'library-lg': '37.5rem',   // 600px - 2xl屏幕下的左栏宽度
        'cardTitle': '18rem',      // 卡片标题最大宽度
      },
      height: {
        'header': '3.5rem',        // 56px - 页面头部高度
      },
      colors: {
        // 日式极简美学色彩系统
        'library': {
          'bg': '#ffffff',
          'border': 'rgba(0, 0, 0, 0.06)',
          'border-hover': 'rgba(0, 0, 0, 0.12)',
          'text': '#000000',
          'text-muted': '#666666',
          'text-subtle': '#999999',
          'tag-bg': 'rgba(0, 0, 0, 0.04)',
          'tag-bg-hover': 'rgba(0, 0, 0, 0.08)',
        },
      },
      backgroundImage: {
        'linear-bg-2': 'linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--background)), hsl(var(--muted)))',
      },
      boxShadow: {
        'macos-window': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateX(-10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      // 添加无滚动条的工具类
      utilities: {
        '.no-scrollbar': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',  /* IE and Edge */
          'scrollbar-width': 'none',  /* Firefox */
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // 添加自定义无滚动条插件
    function({ addUtilities }) {
      const newUtilities = {
        '.no-scrollbar': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',  /* IE and Edge */
          'scrollbar-width': 'none',  /* Firefox */
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
