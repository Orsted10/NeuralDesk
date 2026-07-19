import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AetheriaCompute',
  description: 'Ambient Compute Engine',
  manifest: '/manifest.json',
  themeColor: '#09090b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aetheria'
  },
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
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
