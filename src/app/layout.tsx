import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EditFlow — Turn messy client messages into a clear editing workflow',
  description: 'AI workflow copilot for freelance video editors. Convert scattered client communication into structured projects with requirements, revisions, and conflict detection.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
