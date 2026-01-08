'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw, Download, Database, Users, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface EsySyncUser {
  id: number
  email: string
  fullName: string
  firstName: string
  createdAt?: string
}

interface Sequence {
  id: string
  name: string
}

export default function EsySyncPage() {
  const router = useRouter()
  const [users, setUsers] = useState<EsySyncUser[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<string>('')

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

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/sequences')
      const data = await res.json()
      setSequences(data)
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchSequences()
  }, [])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
    }
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Bitte wähle mindestens einen User aus')
      return
    }

    setImporting(true)
    try {
      const selectedUsers = users
        .filter(u => selectedIds.has(u.id))
        .map(u => ({
          email: u.email,
          firstName: u.firstName
        }))

      const res = await fetch('/api/esysync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: selectedUsers,
          sequenceId: selectedSequence || undefined
        })
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      toast.success(
        `${data.imported} Leads importiert` + 
        (data.duplicates > 0 ? `, ${data.duplicates} Duplikate übersprungen` : '') +
        (data.skippedUnsubscribed > 0 ? `, ${data.skippedUnsubscribed} abgemeldet` : '')
      )

      setSelectedIds(new Set())
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Import fehlgeschlagen')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">EsySync Import</h1>
          <p className="text-muted-foreground">
            Importiere User aus der EsySync Datenbank als Leads
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Import Actions */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {selectedIds.size} ausgewählt
              </Badge>
              
              <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sequenz (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Sequenz</SelectItem>
                  {sequences.map(seq => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Als Leads importieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === users.length && users.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Vorname (Import)</TableHead>
                    <TableHead>E-Mail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={() => toggleSelect(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.fullName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.firstName}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
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
