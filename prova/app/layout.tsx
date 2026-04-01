import type { Metadata } from 'next'
import { JetBrains_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Prova — Formally Verified AI Reasoning',
  description:
    'The first tool that proves your AI reasoned correctly. ' +
    'Paste any AI reasoning chain. Get a formal certificate of logical validity in seconds.',
  metadataBase: new URL('https://prova.cobound.dev'),
  openGraph: {
    title: 'Prova — Formally Verified AI Reasoning',
    description:
      'Does your AI reason correctly? Prova provides formal certificates ' +
      'of logical validity backed by 2,400+ verified mathematical theorems.',
    url: 'https://prova.cobound.dev',
    siteName: 'Prova',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prova — Formally Verified AI Reasoning',
    description: 'The first formal reasoning certificate for AI.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${dmSans.variable}`}>
      <body className="bg-bg text-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
