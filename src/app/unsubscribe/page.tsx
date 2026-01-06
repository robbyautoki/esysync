'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleUnsubscribe = async () => {
    if (!token) {
      setStatus('error')
      setMessage('Ungültiger Abmelde-Link')
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Abmeldung fehlgeschlagen')
      }

      setStatus('success')
      setMessage('Du wurdest erfolgreich abgemeldet.')
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Ein Fehler ist aufgetreten')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Ungültiger Link</h2>
              <p className="text-muted-foreground">
                Dieser Abmelde-Link ist ungültig oder abgelaufen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Newsletter abmelden</CardTitle>
          <CardDescription>
            Möchtest du dich wirklich von unserem Newsletter abmelden?
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Du erhältst dann keine weiteren E-Mails mehr von uns.
              </p>
              <Button 
                onClick={handleUnsubscribe} 
                className="w-full"
                variant="destructive"
              >
                Ja, abmelden
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Wird verarbeitet...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-semibold mb-2">Erfolgreich abgemeldet</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="font-semibold mb-2">Fehler</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button 
                onClick={handleUnsubscribe} 
                variant="outline"
                className="mt-4"
              >
                Erneut versuchen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Wird geladen...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UnsubscribeContent />
    </Suspense>
  )
}
