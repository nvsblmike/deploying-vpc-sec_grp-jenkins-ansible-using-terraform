import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto">
        <Navigation />
        <main className="py-6">{children}</main>
        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p> {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
