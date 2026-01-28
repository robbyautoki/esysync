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

interface EmailSettings {
  companyName?: string
  companyAddress?: string
  footerLogo?: string
  footerText?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  }
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
  const [settings, setSettings] = useState<EmailSettings | null>(null)

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const [settingsRes, emailRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/email')
      ])
      
      let name = companyName
      let address = companyAddress
      let footerLogo: string | undefined
      let footerText: string | undefined
      let socialLinks: EmailSettings['socialLinks'] | undefined
      
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.activeProfile?.companyName) {
          name = data.activeProfile.companyName
        }
      }
      
      if (emailRes.ok) {
        const emailData = await emailRes.json()
        if (emailData.companyName) name = emailData.companyName
        if (emailData.companyAddress) address = emailData.companyAddress
        if (emailData.footerLogo) footerLogo = emailData.footerLogo
        if (emailData.footerText) footerText = emailData.footerText
        if (emailData.socialLinks) socialLinks = emailData.socialLinks
      }
      
      setSettings({ companyName: name, companyAddress: address, footerLogo, footerText, socialLinks })
    } catch {
      // Use defaults
    }
  }

  const displayCompanyName = settings?.companyName || companyName
  const displayAddress = settings?.companyAddress || companyAddress
  const displayLogo = settings?.footerLogo
  const displayFooterText = settings?.footerText
  const socialLinks = settings?.socialLinks

  // Social Media Icons als SVG
  const socialIconsHtml = socialLinks && Object.values(socialLinks).some(v => v) ? `
    <div style="margin:16px 0;">
      ${socialLinks.twitter ? `<a href="${socialLinks.twitter}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733579.png" alt="Twitter" style="width:20px;height:20px;opacity:0.6;" /></a>` : ''}
      ${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/174/174857.png" alt="LinkedIn" style="width:20px;height:20px;opacity:0.6;" /></a>` : ''}
      ${socialLinks.instagram ? `<a href="${socialLinks.instagram}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/174/174855.png" alt="Instagram" style="width:20px;height:20px;opacity:0.6;" /></a>` : ''}
      ${socialLinks.facebook ? `<a href="${socialLinks.facebook}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" style="width:20px;height:20px;opacity:0.6;" /></a>` : ''}
    </div>
  ` : ''

  const footerHtml = `
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#666;">
      ${displayLogo ? `<img src="${displayLogo}" alt="Logo" style="max-width:120px;max-height:60px;margin-bottom:16px;" />` : ''}
      <p style="margin:0 0 8px 0;">${displayCompanyName}</p>
      <p style="margin:0 0 8px 0;">${displayAddress}</p>
      ${displayFooterText ? `<p style="margin:0 0 12px 0;">${displayFooterText}</p>` : ''}
      ${socialIconsHtml}
      <p style="margin:16px 0 0 0;">
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
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
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
                  height: 'auto',
                  minHeight: '300px',
                  maxHeight: '60vh'
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
