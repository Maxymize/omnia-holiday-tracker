import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Omnia Holiday Tracker',
  description: 'Sistema di gestione ferie per OmniaGroup',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}