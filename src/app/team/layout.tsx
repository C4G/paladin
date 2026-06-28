import { TeamTabs } from './team-tabs';

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Mobile: stacked, Desktop: sidebar + content */}
      <div className='flex flex-col gap-6 md:grid md:min-h-[calc(100dvh-12rem)] md:grid-cols-[240px_1fr] md:gap-0'>
        <aside className='md:border-r md:border-border md:pr-6'>
          <TeamTabs />
        </aside>
        <main className='min-w-0 md:pl-8'>{children}</main>
      </div>
    </div>
  );
}
