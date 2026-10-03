import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { WhatsAppFloatingButton } from "@/components/contact/WhatsAppFloatingButton";
import { contactConfig } from "@/config/contact.config";

// Context & State Providers
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import LanguageProvider from "@/providers/LanguageProvider";
import NotificationProvider from "@/providers/NotificationProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gokul Vivaham | கோகுல் விவாஹம் - South Indian Matrimony",
  description: "Where Matches Begin with Compatibility. Experience the most trusted, culturally elegant, and modern South Indian Matrimony site.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Gokul Vivaham",
    "alternateName": contactConfig.brand.name,
    "description": contactConfig.brand.tagline,
    "telephone": contactConfig.phone.display,
    "email": contactConfig.email.support,
    "url": "https://gokulvivaham.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": contactConfig.address.streetAddress,
      "addressLocality": contactConfig.address.addressLocality,
      "addressRegion": contactConfig.address.addressRegion,
      "postalCode": contactConfig.address.postalCode,
      "addressCountry": contactConfig.address.addressCountry,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": contactConfig.address.geo.latitude,
      "longitude": contactConfig.address.geo.longitude
    }
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && systemPrefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <Navbar />
                  <main className="flex-1 flex flex-col w-full pb-16 lg:pb-0">{children}</main>
                  <Footer />
                  <MobileBottomNav />
                  <WhatsAppFloatingButton />
                </NotificationProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
