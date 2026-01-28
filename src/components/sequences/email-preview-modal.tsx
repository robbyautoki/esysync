'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Monitor, Smartphone, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: string
  body: string
  companyName?: string
  companyAddress?: string
  onEdit?: () => void
}

export function EmailPreviewModal({
  open,
  onOpenChange,
  subject,
  body,
  companyName = 'Dein Unternehmen',
  companyAddress = 'Musterstraße 1, 12345 Stadt',
  onEdit
}: EmailPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [settings, setSettings] = useState<{ companyName?: string; companyAddress?: string } | null>(null)

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.activeProfile) {
          setSettings({
            companyName: data.activeProfile.companyName,
            companyAddress: data.companyAddress || companyAddress
          })
        }
      }
    } catch {
      // Use defaults
    }
  }

  const displayCompanyName = settings?.companyName || companyName
  const displayAddress = settings?.companyAddress || companyAddress

  const footerHtml = `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#666;">
      <p style="margin:0 0 8px 0;">${displayCompanyName}</p>
      <p style="margin:0 0 8px 0;">${displayAddress}</p>
      <p style="margin:0;">
        <a href="{{unsubscribeUrl}}" style="color:#666;text-decoration:underline;">Abmelden</a>
      </p>
    </div>
  `

  const fullEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:20px;background-color:#f5f5f5;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <div style="padding:32px;">
          ${body}
          ${footerHtml}
        </div>
      </div>
    </body>
    </html>
  `

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-medium truncate">
                {subject || 'E-Mail Vorschau'}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          <div 
            className={cn(
              "mx-auto transition-all duration-300",
              viewMode === 'desktop' ? 'max-w-[600px]' : 'max-w-[375px]'
            )}
          >
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="border-b px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>Von:</span>
                  <span className="text-foreground">{displayCompanyName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Betreff:</span>
                  <span className="text-foreground font-medium">{subject}</span>
                </div>
              </div>
              <iframe
                srcDoc={fullEmailHtml}
                className="w-full border-0"
                style={{ 
                  height: viewMode === 'desktop' ? '500px' : '600px',
                  minHeight: '400px'
                }}
                title="E-Mail Vorschau"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
