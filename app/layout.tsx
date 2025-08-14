import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/toast-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Omnia Holiday Tracker',
  description: 'Sistema di gestione ferie per OmniaGroup - Gestisci le tue ferie facilmente',
  keywords: 'ferie, holiday, tracker, omnia, gestione, dipendenti, calendario',
  authors: [{ name: 'OmniaGroup' }],
  creator: 'OmniaGroup',
  publisher: 'OmniaGroup',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/images/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/images/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/images/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/images/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/images/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Omnia Holidays',
    startupImage: [
      {
        url: '/images/icon-512x512.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Omnia Holiday Tracker',
    title: 'Omnia Holiday Tracker',
    description: 'Sistema di gestione ferie per OmniaGroup',
    images: [
      {
        url: '/images/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Omnia Holiday Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Omnia Holiday Tracker',
    description: 'Sistema di gestione ferie per OmniaGroup',
    images: ['/images/icon-512x512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e40af' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Omnia Holiday Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Omnia Holidays" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Favicon Links */}
        <link rel="icon" type="image/png" sizes="72x72" href="/images/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/images/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/images/icon-128x128.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/icon-512x512.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/images/icon-192x192.png" />
        
        {/* Splash Screen for iOS */}
        <link rel="apple-touch-startup-image" href="/images/icon-512x512.png" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-square70x70logo" content="/images/icon-72x72.png" />
        <meta name="msapplication-square150x150logo" content="/images/icon-152x152.png" />
        <meta name="msapplication-wide310x150logo" content="/images/icon-384x384.png" />
        <meta name="msapplication-square310x310logo" content="/images/icon-512x512.png" />
        
        {/* Preload critical resources */}
        <link rel="preload" as="style" href="/globals.css" />
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}