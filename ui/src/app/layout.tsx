import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getSiteConfig } from "@/lib/site-config";
import "@/styles/globals.css";

const cfg = getSiteConfig();

export const metadata: Metadata = {
  title: {
    default: cfg.site.title,
    template: cfg.site.titleTemplate,
  },
  description: cfg.site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
