import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/nav-bar";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Assumption Roam Rent",
    template: "%s | Assumption Roam Rent",
  },
  description: "Vehicle rental platform for customers, owners, and admins.",
  applicationName: "Assumption Roam Rent",
  keywords: [
    "car rental",
    "vehicle rental",
    "SUV rental",
    "motorbike rental",
    "van rental",
    "luxury car rental",
  ],
  openGraph: {
    title: "Assumption Roam Rent",
    description: "Browse vehicles, book trips, and manage rentals in one platform.",
    type: "website",
    siteName: "Assumption Roam Rent",
  },
  twitter: {
    card: "summary_large_image",
    title: "Assumption Roam Rent",
    description: "Browse vehicles, book trips, and manage rentals in one platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
       <AuthProvider>
        <Navbar />
       </AuthProvider>

        {children}
      </body>
    </html>
  );
}
