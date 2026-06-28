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
import { ExternalLink, Video } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Project Demo',
  description: 'Demo of our project',
};

export default function DemoPage() {
  const demoVideoUrl = 'https://www.youtube.com/watch?v=7QSIqkHBA5o';
  const embeddedDemoVideoUrl = 'https://www.youtube.com/embed/7QSIqkHBA5o';

  return (
    <div className='space-y-6'>
      <h1 className='mb-4 text-2xl font-semibold'>Project Demo</h1>

      <Card>
        <CardHeader className='flex flex-row items-center gap-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <Video className='h-6 w-6' />
          </div>
          <div>
            <CardTitle>Demo</CardTitle>
            <CardDescription>
              Watch our teams demo presentation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            View our P6 Demo video below to see our project in action.
          </p>

          <div className='overflow-hidden rounded-lg border border-border bg-black'>
            <iframe
              className='aspect-video w-full'
              src={embeddedDemoVideoUrl}
              title='Paladin project demo video'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              referrerPolicy='strict-origin-when-cross-origin'
              allowFullScreen
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            asChild
            className='gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
          >
            <Link href={demoVideoUrl} target='_blank' rel='noopener noreferrer'>
              Open Video
              <ExternalLink className='h-4 w-4' />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
