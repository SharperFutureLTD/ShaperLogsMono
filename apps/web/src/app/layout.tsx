import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from './providers'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  title: 'Sharper Logs',
  description: 'Your career growth engine - never forget what you\'ve accomplished',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,       // Allow zoom for accessibility
  userScalable: true,    // Don't prevent pinch-zoom
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
