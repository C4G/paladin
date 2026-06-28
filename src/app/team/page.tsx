import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Our team and project information',
};

const teamMembers = [
  {
    name: 'Eric Baker',
    email: 'ebaker67@gatech.edu',
    title: 'Senior Software Engineer',
    role: 'Engineering',
  },
  {
    name: 'Chidvi Doddi',
    email: 'cdoddi3@gatech.edu',
    title: 'L2 Support',
    role: 'Support',
  },
  {
    name: 'Mariah Qureshi',
    email: 'mqureshi47@gatech.edu',
    title: 'TPM',
    role: 'Program Management',
  },
  {
    name: 'Samantha Reth',
    email: 'sreth3@gatech.edu',
    title: 'Senior Network PM',
    role: 'Program Management',
  },
  {
    name: 'Adithya Shanker',
    email: 'ashanker36@gatech.edu',
    title: 'Software Engineer',
    role: 'Engineering',
  },
];

export default function TeamPage() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-semibold tracking-tight'>Team Members</h1>
      <div className='overflow-hidden rounded-lg border border-border'>
        <table className='w-full text-left text-sm'>
          <thead className='border-b border-border bg-muted/50'>
            <tr>
              <th className='px-4 py-3 font-medium text-muted-foreground'>
                Name
              </th>
              <th className='px-4 py-3 font-medium text-muted-foreground'>
                Title
              </th>
              <th className='px-4 py-3 font-medium text-muted-foreground'>
                Role
              </th>
              <th className='px-4 py-3 font-medium text-muted-foreground'>
                Email
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {teamMembers.map((member) => (
              <tr
                key={member.email}
                className='transition-colors hover:bg-muted/50'
              >
                <td className='px-4 py-3 font-medium'>{member.name}</td>
                <td className='px-4 py-3'>{member.title}</td>
                <td className='px-4 py-3'>
                  <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                    {member.role}
                  </span>
                </td>
                <td className='px-4 py-3'>
                  <a
                    href={`mailto:${member.email}`}
                    className='text-primary underline-offset-4 hover:underline'
                  >
                    {member.email}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
