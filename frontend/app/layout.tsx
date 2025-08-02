import "./globals.css";
import { Inter } from "next/font/google";
import { TimeZoneProvider } from "@/lib/time-zone-context";
import { Providers } from "./providers";
import { I18nProvider } from "@/components/providers/I18nProvider";

// 配置 Inter 字体
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Nexus",
  description: "Nexus dashboard and management system",
  // Favicon icons (shared with Telepace)
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "icon", url: "/img/favicon.png", type: "image/png", sizes: "64x64" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <I18nProvider initialLocale="en">
            <TimeZoneProvider>{children}</TimeZoneProvider>
          </I18nProvider>
        </Providers>
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
