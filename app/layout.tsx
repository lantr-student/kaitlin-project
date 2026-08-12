import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/components/AppStateProvider";

export const metadata: Metadata = {
  title: "Spotter",
  description: "Spotter — a training plan that adjusts to you, with the reasoning always visible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
