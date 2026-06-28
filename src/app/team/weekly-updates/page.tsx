import type { Metadata } from 'next';
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
import { ExternalLink, BarChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Weekly Updates',
  description: 'Weekly project updates',
};

export default function WeeklyUpdatesPage() {
  return (
    <div className='space-y-6'>
      <h1 className='mb-4 text-2xl font-semibold'>Weekly Updates</h1>

      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <BarChart className='h-6 w-6' />
          </div>
          <div>
            <CardTitle>Team Loop Dashboard</CardTitle>
            <CardDescription>
              Track team progress and weekly updates in one place
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>
            The Loop Dashboard provides a comprehensive view of our teams
            progress, tasks, and weekly updates. Professors, TAs, and
            instructors can use this dashboard to monitor project development.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className='gap-2 dark:text-gray-900'>
            <Link
              href='https://gtvault.sharepoint.com/:fl:/g/contentstorage/CSP_26e25c49-5515-42cc-994f-3f87c2330124/IQBTW5eRljalRpZeIfbSAaV_ATJw-8P_-otErPX1NZmDnbE?e=ihfRmD&nav=cz0lMkZjb250ZW50c3RvcmFnZSUyRkNTUF8yNmUyNWM0OS01NTE1LTQyY2MtOTk0Zi0zZjg3YzIzMzAxMjQmZD1iJTIxU1Z6aUpoVlZ6RUtaVHotSHdqTUJKRnJWUGZudUVScEdvRzVsb0NBaGppd2hqakttYUdEblE3SUZVSGVZRWQyUSZmPTAxRzc3SEdMMlRMT0xaREZSV1VWREpNWFJCNjNKQURKTDcmYz0lMkYmYT1Mb29wQXBwJnA9JTQwZmx1aWR4JTJGbG9vcC1wYWdlLWNvbnRhaW5lciZ4PSU3QiUyMnclMjIlM0ElMjJUMFJUVUh4bmRIWmhkV3gwTG5Ob1lYSmxjRzlwYm5RdVkyOXRmR0loVTFaNmFVcG9WbFo2UlV0YVZIb3RTSGRxVFVKS1JuSldVR1p1ZFVWU2NFZHZSelZzYjBOQmFHcHBkMmhxYWt0dFlVZEVibEUzU1VaVlNHVlpSV1F5VVh3d01VYzNOMGhIVEROVFYwUk5UMDlOVlVkRlJrRktSRWMwTlZOWFMxUlJTVnBhJTIyJTJDJTIyaSUyMiUzQSUyMmY1YWNlMmNjLTMxYjgtNDQyZi1iMGFkLTgxZGZiZmI1Y2VjZSUyMiU3RA%3D%3D'
              target='_blank'
              rel='noopener noreferrer'
            >
              View Dashboard
              <ExternalLink className='h-4 w-4' />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className='bg-muted/50'>
        <CardHeader>
          <CardTitle className='text-lg'>Dashboard Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='ml-6 list-disc space-y-2 text-muted-foreground'>
            <li>Access to real-time progress indicators</li>
            <li>Weekly status updates from all team members</li>
            <li>Task completion rates and milestone tracking</li>
            <li>Comments/feedback section for instructors</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
