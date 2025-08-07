import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to Italian login page
  redirect('/it/login');
}