import { Metadata } from 'next';
import { UsersGrid } from './users-grid';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Users',
  description: 'User Management Page',
};

export default async function UsersPage() {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className='px-4 py-8'>
      <h1 className='mb-4 text-2xl font-bold'>Users</h1>
      <UsersGrid />
    </div>
  );
}
