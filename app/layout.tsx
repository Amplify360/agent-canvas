import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Canvas',
  description: 'AI Agent Workflow Visualization and Configuration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-layout">{children}</body>
    </html>
  );
}
