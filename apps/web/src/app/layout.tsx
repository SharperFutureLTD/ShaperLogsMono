import './globals.css'
import { GeistSans, GeistMono } from 'geist/font'
import { Providers } from './providers'

export const metadata = {
  title: 'Sharper Logs',
  description: 'Professional development logging and content generation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-mono antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
