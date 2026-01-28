'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, RefreshCw, Database, Users, AlertCircle, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface EsySyncUser {
  id: number
  email: string
  firstName: string
  lastName: string
  fullName: string
  isVerified: boolean
}

export default function EsySyncPage() {
  const router = useRouter()
  const [users, setUsers] = useState<EsySyncUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/esysync/users')
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Laden')
      }
      
      setUsers(data.data)
    } catch (err: any) {
      setError(err.message || 'Verbindungsfehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/esysync/sync', { method: 'POST' })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      const messages = []
      if (data.imported > 0) messages.push(`${data.imported} neue Leads`)
      if (data.addedToSegment > 0) messages.push(`${data.addedToSegment} zum Segment hinzugefügt`)
      if (data.skippedUnsubscribed > 0) messages.push(`${data.skippedUnsubscribed} abgemeldet übersprungen`)
      
      toast.success(
        messages.length > 0 
          ? `Sync erfolgreich: ${messages.join(', ')}`
          : 'Sync erfolgreich - keine neuen Änderungen'
      )
      
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">EsySync Übersicht</h1>
          <p className="text-muted-foreground">
            Live-Ansicht der externen Datenbank. Synchronisierte Leads findest du im{' '}
            <Link href="/leads?segment=esysync" className="text-purple-600 hover:underline">
              EsySync-Segment
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={syncing || loading}>
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4 mr-2" />
            )}
            Jetzt synchronisieren
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-purple-50/50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-100 text-purple-700 border-purple-300">esysync</Badge>
            <p className="text-sm text-purple-700">
              Alle synchronisierten User werden automatisch dem EsySync-Segment hinzugefügt. 
              Du kannst das Segment in Sequenzen verwenden.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>EsySync Users</CardTitle>
          </div>
          <CardDescription>
            Live-Ansicht der User aus der externen Datenbank
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium">Verbindungsfehler</h3>
              <p className="text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchUsers}>
                Erneut versuchen
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine User gefunden</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Vorname</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.firstName}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <Badge variant="success">Verifiziert</Badge>
                        ) : (
                          <Badge variant="secondary">Nicht verifiziert</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
