import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paladin Farm & Ranch',
    short_name: 'Paladin',
    description:
      'Experience excellence in farming and ranching. We provide top-quality agricultural services and products for your success.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#800020', // Updated to match brand color
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
