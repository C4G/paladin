import type { UserRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  // Augment the Session interface from next-auth
  // eslint-disable-next-line no-unused-vars
  interface Session {
    user: {
      role: UserRole | null;
    } & DefaultSession['user'];
  }
}
