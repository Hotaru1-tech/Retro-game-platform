import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RetroPlay - Multiplayer Game Platform',
  description: 'A retro OS-style multiplayer game platform with real-time gameplay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="crt-effect">
        {children}
      </body>
    </html>
  );
}
