import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();
  if (session) {
    return redirect('/dashboard');
  }
  return redirect('/login');
}
