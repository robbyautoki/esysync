'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Info, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { SegmentSelect } from '@/components/segments/segment-select'

interface ImportModalProps {
  children: React.ReactNode
}

type Step = 'upload' | 'mapping' | 'segment' | 'result'

interface ImportResult {
  imported: number
  duplicates: number
  errors: string[]
}

export function ImportModal({ children }: ImportModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<{ email: string; firstName: string; customFields: string[] }>({
    email: '',
    firstName: '',
    customFields: []
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setCsvData([])
    setHeaders([])
    setMapping({ email: '', firstName: '', customFields: [] })
    setResult(null)
    setSelectedSegmentId(null)
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Bitte eine CSV-Datei auswählen')
      return
    }

    setFile(selectedFile)

    Papa.parse(selectedFile, {
      complete: (results) => {
        const data = results.data as string[][]
        if (data.length < 2) {
          toast.error('Die CSV-Datei ist leer oder enthält keine Daten')
          return
        }

        const fileHeaders = data[0]
        setHeaders(fileHeaders)
        setCsvData(data.slice(1).filter(row => row.some(cell => cell.trim())))

        // Auto-detect common column names
        const emailCol = fileHeaders.findIndex(h => 
          h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail')
        )
        const nameCol = fileHeaders.findIndex(h => 
          h.toLowerCase().includes('vorname') || 
          h.toLowerCase().includes('first') ||
          h.toLowerCase().includes('name')
        )

        setMapping(prev => ({
          ...prev,
          email: emailCol >= 0 ? fileHeaders[emailCol] : '',
          firstName: nameCol >= 0 ? fileHeaders[nameCol] : ''
        }))

        setStep('mapping')
      },
      error: () => {
        toast.error('Fehler beim Lesen der CSV-Datei')
      }
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const input = document.createElement('input')
      input.type = 'file'
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(droppedFile)
      input.files = dataTransfer.files
      handleFileChange({ target: input } as any)
    }
  }, [handleFileChange])

  const toggleCustomField = (header: string) => {
    setMapping(prev => ({
      ...prev,
      customFields: prev.customFields.includes(header)
        ? prev.customFields.filter(h => h !== header)
        : [...prev.customFields, header]
    }))
  }

  const handleImport = async () => {
    if (!mapping.email || !mapping.firstName) {
      toast.error('Bitte E-Mail und Vorname Spalten zuordnen')
      return
    }

    setLoading(true)

    const emailIndex = headers.indexOf(mapping.email)
    const firstNameIndex = headers.indexOf(mapping.firstName)
    const customFieldIndices = mapping.customFields.map(h => ({
      name: h,
      index: headers.indexOf(h)
    }))

    const leads = csvData.map(row => {
      const customFields: Record<string, string> = {}
      customFieldIndices.forEach(({ name, index }) => {
        if (row[index]) {
          customFields[name] = row[index]
        }
      })

      return {
        email: row[emailIndex]?.trim(),
        firstName: row[firstNameIndex]?.trim(),
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined
      }
    }).filter(lead => lead.email && lead.firstName)

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, segmentId: selectedSegmentId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import fehlgeschlagen')
      }

      setResult(data)
      setStep('result')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Import')
    } finally {
      setLoading(false)
    }
  }

  const availableHeaders = headers.filter(h => 
    h !== mapping.email && h !== mapping.firstName
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>CSV importieren</DialogTitle>
              <DialogDescription>
                Importiere Leads aus einer CSV-Datei. Die Datei muss mindestens E-Mail und Vorname enthalten.
              </DialogDescription>
            </DialogHeader>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                CSV-Datei hierher ziehen
              </p>
              <p className="text-xs text-muted-foreground">
                oder klicken zum Auswählen
              </p>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle>Spalten zuordnen</DialogTitle>
              <DialogDescription>
                Ordne die CSV-Spalten den Lead-Feldern zu. {csvData.length} Zeilen gefunden.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>E-Mail Spalte *</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Die Spalte mit den E-Mail-Adressen deiner Leads
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={mapping.email} onValueChange={(v) => setMapping(p => ({ ...p, email: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Spalte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h} disabled={h === mapping.firstName}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Vorname Spalte *</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Die Spalte mit den Vornamen deiner Leads
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={mapping.firstName} onValueChange={(v) => setMapping(p => ({ ...p, firstName: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Spalte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h} disabled={h === mapping.email}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {availableHeaders.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Custom Fields (optional)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Zusätzliche Spalten die als Custom Fields gespeichert werden
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableHeaders.map(h => (
                        <Button
                          key={h}
                          variant={mapping.customFields.includes(h) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleCustomField(h)}
                        >
                          {h}
                          {mapping.customFields.includes(h) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {mapping.email && mapping.firstName && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <p className="text-xs font-medium mb-2">Vorschau (erste 3 Zeilen)</p>
                  <div className="space-y-1 text-xs">
                    {csvData.slice(0, 3).map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span>{row[headers.indexOf(mapping.firstName)]}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{row[headers.indexOf(mapping.email)]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Zurück
              </Button>
              <Button
                onClick={() => setStep('segment')}
                disabled={!mapping.email || !mapping.firstName}
              >
                Weiter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'segment' && (
          <>
            <DialogHeader>
              <DialogTitle>Segment zuweisen (optional)</DialogTitle>
              <DialogDescription>
                Weise die importierten Leads einem Segment zu oder überspringe diesen Schritt.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <SegmentSelect
                  value={selectedSegmentId}
                  onChange={setSelectedSegmentId}
                  placeholder="Kein Segment (optional)"
                  allowCreate={true}
                  className="w-full"
                />
              </div>

              {selectedSegmentId && (
                <p className="text-sm text-muted-foreground">
                  {csvData.length} Leads werden dem Segment zugewiesen.
                </p>
              )}

              {!selectedSegmentId && (
                <p className="text-sm text-muted-foreground">
                  Leads werden ohne Segment-Zuordnung importiert.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Zurück
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? 'Importiere...' : `${csvData.length} Leads importieren`}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'result' && result && (
          <>
            <DialogHeader>
              <DialogTitle>Import abgeschlossen</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">{result.imported} Leads importiert</p>
                </div>
              </div>

              {result.duplicates > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{result.duplicates} Duplikate übersprungen</p>
                    <p className="text-sm opacity-80">
                      Diese E-Mail-Adressen existieren bereits
                    </p>
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">{result.errors.length} Fehler</p>
                  </div>
                  <ul className="text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... und {result.errors.length - 5} weitere</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
