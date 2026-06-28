import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ExternalLink, ClipboardCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Project Peer Evaluations',
  description: 'Peer evaluations for the project',
};

export default function PeerEvaluationsPage() {
  return (
    <div className='space-y-6'>
      <h1 className='mb-4 text-2xl font-semibold'>Project Peer Evaluations</h1>

      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <ClipboardCheck className='h-6 w-6' />
          </div>
          <div>
            <CardTitle>Team Evaluation Survey</CardTitle>
            <CardDescription>
              Provide feedback to the Paladin Farm and Ranch team
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>
            Your honest assessment helps improve our website. Click the link
            below to complete the survey.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className='gap-2 dark:text-gray-900'>
            <Link
              href='https://forms.gle/QCzQb4jmgbKR3Y9W6'
              target='_blank'
              rel='noopener noreferrer'
            >
              Complete Survey
              <ExternalLink className='h-4 w-4' />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className='bg-muted/50'>
        <CardHeader>
          <CardTitle className='text-lg'>Evaluation Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='ml-6 list-disc space-y-2 text-muted-foreground'>
            <li>Be honest and constructive in your feedback</li>
            <li>
              Complete the survey by the deadline:{' '}
              <strong>March 22, 2026</strong>
            </li>
            <li>Your responses will help improve the website</li>
            <li>Contact your instructor if you have any questions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
