import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { PushNotificationManager } from '@/components/PushNotification';
import { Toaster } from '@/components/ui/toaster';
import { auth } from '@/lib/auth';
import { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import localFont from 'next/font/local';
import Script from 'next/script';
import type React from 'react';
import { GoogleMapsProvider } from '../components/providers/GoogleMapsProvider';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Paladin Farm & Ranch',
  description:
    'Experience excellence in farming and ranching. We provide top-quality agricultural services and products for your success.',
  icons: {
    icon: '/favicon.ico',
  },
};

const googleMapsLibraries: Libraries = ['places'];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <link rel='icon' href='/favicon.ico' sizes='any' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          <SessionProvider session={session}>
            <Header />
            <GoogleMapsProvider
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
              language='en'
              libraries={googleMapsLibraries}
            >
              <div className='min-h-[calc(100dvh-8.4rem)]'>{children}</div>
            </GoogleMapsProvider>
            <Footer />
            <Toaster />
            {session && <PushNotificationManager />}
          </SessionProvider>
        </ThemeProvider>
        <Script
          defer
          src='https://analytics.c4g.dev/script.js'
          data-website-id='62bcae74-6e42-4a33-b406-3cf45f7d03e0'
        />
      </body>
    </html>
  );
}
