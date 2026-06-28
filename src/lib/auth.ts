import NextAuth, { type NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import Google from 'next-auth/providers/google';
import type { User } from '@prisma/client';

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  // This allows the system to merge Google accounts with those created directly with email (like we do in the DB when creating entries manually for testing)
  // Since we only allow Google Signup, this should be acceptable and makes testing easier.
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/signin',
    newUser: '/registration',
  },
  callbacks: {
    session({ session, user }) {
      session.user.role = (user as User).role;
      return session;
    },
  },
};
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
