import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocaleHomePage({
  params,
}: PageProps) {
  const { locale } = await params;
  // Redirect to login page by default
  redirect(`/${locale}/login`);
}