import { ReactNode } from 'react';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin navigation will be added later */}
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Omnia Admin</h1>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="flex">
        {/* Sidebar will be added later */}
        <aside className="w-64 bg-gray-800 text-white">
          <div className="h-screen p-4">
            {/* Admin menu items */}
          </div>
        </aside>
        
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}