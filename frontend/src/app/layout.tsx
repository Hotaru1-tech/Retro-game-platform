import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import AuthSync from '@/components/AuthSync';
import { clerkEnabled } from '@/lib/clerk-config';
import './globals.css';

export const metadata: Metadata = {
  title: 'RetroPlay - Multiplayer Game Platform',
  description: 'A retro OS-style multiplayer game platform with real-time gameplay',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <body className="crt-effect">
      <AuthSync />
      {children}
    </body>
  );

  return (
    <html lang="en">
      {clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content}
    </html>
  );
}
