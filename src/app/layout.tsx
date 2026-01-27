import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { ClerkProvider } from '@clerk/nextjs'
import { deDE } from '@clerk/localizations'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EsySync - Newsletter Tool',
  description: 'Erstelle und verwalte E-Mail-Sequenzen',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={deDE}>
      <html lang="de">
        <body className={inter.className}>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}
