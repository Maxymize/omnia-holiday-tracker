import { ReactNode } from 'react';
import { locales } from '@/lib/i18n/config';
import { I18nProvider } from '@/lib/i18n/provider';
import { LogoProvider } from '@/lib/contexts/LogoContext';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = await params;
  
  return (
    <I18nProvider locale={locale}>
      <LogoProvider>
        {children}
      </LogoProvider>
    </I18nProvider>
  );
}