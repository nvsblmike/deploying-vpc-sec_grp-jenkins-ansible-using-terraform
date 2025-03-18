/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '@/lib/mongodb';
import type { User as UserType } from '@/types/db';
import { checkPassword } from '@/lib/password';

// Define the session types
declare module 'next-auth' {
  interface Session {
    user: User;
  }
  interface User extends UserType {
    id: string;
  }
}

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Invalid credentials');
          }
          const db = await getDb();
          const collection = db.collection<UserType>('users');
          const user = await collection.findOne({
            email: {
              $regex: credentials.email,
              $options: 'i',
            },
          });

          if (!user) {
            throw new Error('Invalid credentials');
          }
          const isValidPassword = checkPassword(user.password, credentials.password);

          if (!isValidPassword) {
            throw new Error('Invalid credentials');
          }

          return {
            id: user._id.toString(),
            username: user.username,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
            email: user.email,
            name: [user.name.first, user.name.last].join(' '),
          } as any;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(error.message);
          } else {
            throw new Error('Unknown error');
          }
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // If this is a sign in
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.isAdmin = user.isAdmin;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
const getSession = () => getServerSession(authOptions);

export { authOptions, getSession };

export async function getServerAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session.user;
}

export async function authMiddleware(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return null;
}
