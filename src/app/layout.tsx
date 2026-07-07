import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuralDesk JARVIS',
  description: 'AI-Powered Workspace Assistant',
  verification: {
    google: "iAFq7UHZVR1PPfzY-Nf4X7MS7derRebKr__J6HjAZAw",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
