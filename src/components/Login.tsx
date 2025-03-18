'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || 'Login failed');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
        router.refresh();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setIsLoading(false);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Partner Logo at top */}
      <div className="w-full bg-white py-4 px-6 flex justify-between items-center shadow-sm">
        <Image src="/partner-logo.png" alt="Partner" width={120} height={40} className="h-8 w-auto" priority />
        <span className="text-sm text-gray-500">Attendance Management System</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Login Card */}
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <div className="flex flex-col items-center gap-2">
                <LogIn className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <p className="text-sm text-gray-500">Sign in to manage attendance records</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </CardContent>

            {/* InvexERP as technology provider */}
            <div className="flex flex-col items-center gap-2 py-6 border-t">
              <span className="text-sm text-gray-500">Technology by</span>
              <Image src="/invex-logo.svg" alt="InvexERP" width={100} height={32} className="h-8 w-auto" />
            </div>

            <CardFooter className="justify-center border-t">
              <p className="text-sm text-gray-500">{new Date().getFullYear()} All rights reserved.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
