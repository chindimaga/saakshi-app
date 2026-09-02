import type { Metadata } from 'next';
import { THEME_BOOT_SCRIPT } from '../shared/theme';
import './globals.css';

const description = 'Independent prototype. Nothing entered here is submitted to the official portal.';
const siteUrl = 'https://saakshi-v2.rahu760.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Saakshi — Cybercrime complaint support',
  description,
  referrer: 'no-referrer',
  icons: { icon: '/neutral.svg' },
  openGraph: {
    title: 'Saakshi — Cybercrime complaint support',
    description,
    url: siteUrl,
    siteName: 'Saakshi',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Saakshi — Safety, on your side' }],
  },
  twitter: { card: 'summary_large_image', title: 'Saakshi — Cybercrime complaint support', description, images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
