'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, Settings } from 'lucide-react';

const navigation = [
  {
    name: 'Attendance',
    href: '/dashboard',
    icon: CalendarDays,
  },

  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4 px-4 py-2 border-b">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'inline-flex items-center px-3 py-2 text-sm font-medium transition-colors relative',
              isActive
                ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:-mb-2'
                : 'text-muted-foreground hover:text-primary',
            )}
          >
            <item.icon className="w-4 h-4 mr-2" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
