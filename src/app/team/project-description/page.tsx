import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Description',
  description: 'Description of our project',
};

export default function ProjectDescriptionPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Project Description
        </h1>
        <p className='text-sm text-muted-foreground'>
          What we&apos;re building and why
        </p>
      </div>
      <div className='rounded-lg border border-border p-6'>
        <p className='leading-relaxed text-foreground'>
          The Paladin Farm and Ranch webapp provides a centralized database with
          geolocation and inventory information that allows farms and ranches to
          better communicate their needs during times of disaster.
        </p>
      </div>
    </div>
  );
}
