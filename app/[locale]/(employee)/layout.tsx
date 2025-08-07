import { ReactNode } from 'react';

export default function EmployeeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}