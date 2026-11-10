import type { MetadataRoute } from 'next';

// Installable on phones: "Add to Home screen" opens straight into the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zlaqa Team OS',
    short_name: 'Zlaqa OS',
    description: 'Check in, track OKRs and talk to your team.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
