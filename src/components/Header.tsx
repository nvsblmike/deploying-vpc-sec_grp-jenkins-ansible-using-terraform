'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <header className="bg-white shadow-sm container mx-auto">
      <div className="mx-auto sm:px-6  py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image src="/partner-logo.png" alt="Partner" width={120} height={40} className="h-8 w-auto" priority />
          <h1 className="text-xl font-semibold text-gray-900">Attendance Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-700">
            <User className="w-4 h-4 mr-2" />
            <span>{session?.user?.name}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
