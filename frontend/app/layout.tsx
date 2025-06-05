import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TimeZoneProvider } from "@/lib/time-zone-context";
import { Toaster } from "@/components/ui/toaster";

// 配置 Inter 字体
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Nexus",
  description: "Nexus dashboard and management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TimeZoneProvider>{children}</TimeZoneProvider>
        </ThemeProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 抑制浏览器扩展连接错误
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('Could not establish connection') || 
                      message.includes('runtime.lastError') ||
                      message.includes('Receiving end does not exist')) {
                    // 静默处理扩展连接错误
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
