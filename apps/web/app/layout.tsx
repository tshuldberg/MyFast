import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'MyFast — Intermittent Fasting Timer',
  description: 'A timer shouldn\'t cost $70/yr. MyFast: $4.99 forever.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#0D0B0F',
          color: '#F5F2F8',
          fontFamily: 'Inter, system-ui, sans-serif',
          margin: 0,
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
