import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIT — GoodLife Tracker",
  description: "Personal gym tracker for body recomposition",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FIT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Draw edge-to-edge and expose the notch / home-indicator insets via env()
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-[100dvh] bg-background">
          {/* Mobile-first column; top inset keeps content clear of the status bar */}
          <main className="mx-auto max-w-lg px-4 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
