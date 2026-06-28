import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Goals',
  description: 'Goals of our project',
};

const goals = [
  {
    title: 'Crisis Support',
    description: 'Support Farm and Ranch needs during times of crisis.',
  },
  {
    title: 'Communication Platform',
    description: 'Provide a communication platform for disaster responders.',
  },
  {
    title: 'Geolocation & Mapping',
    description:
      'Deliver a comprehensive geolocation and map system to provide insights on farm layouts.',
  },
  {
    title: 'Community Empowerment',
    description:
      'Empower volunteers with the ability to support their community with quick disaster assistance.',
  },
];

export default function ProjectGoalPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>Project Goals</h1>
        <p className='text-sm text-muted-foreground'>
          The core objectives driving our work
        </p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        {goals.map((goal) => (
          <div
            key={goal.title}
            className='flex flex-col gap-1.5 rounded-lg border border-border p-6 transition-colors hover:bg-muted/50'
          >
            <h3 className='font-semibold'>{goal.title}</h3>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {goal.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
