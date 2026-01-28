'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import ImageResize from 'tiptap-extension-resize-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Unlink,
  ImageIcon,
  Upload,
  Loader2,
  AlertTriangle,
  MousePointerClick,
  Minus,
  MoveVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Custom CTA Button Extension
const CtaButton = Node.create({
  name: 'ctaButton',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      text: { default: 'Button' },
      href: { default: '#' },
      color: { default: '#000000' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="cta-button"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'cta-button' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = 'my-4'
      
      const button = document.createElement('a')
      button.href = node.attrs.href
      button.textContent = node.attrs.text
      button.style.cssText = `
        display: inline-block;
        background-color: ${node.attrs.color};
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
      `
      dom.appendChild(button)
      
      return { dom }
    }
  },
})

// Custom Spacer Extension
const Spacer = Node.create({
  name: 'spacer',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      size: { default: 'medium' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spacer"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'spacer' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      const sizes: Record<string, string> = {
        small: '16px',
        medium: '32px',
        large: '48px',
      }
      dom.style.height = sizes[node.attrs.size] || '32px'
      dom.style.backgroundColor = 'rgba(0,0,0,0.03)'
      dom.style.borderRadius = '4px'
      dom.style.display = 'flex'
      dom.style.alignItems = 'center'
      dom.style.justifyContent = 'center'
      dom.innerHTML = `<span style="font-size:10px;color:#999;">↕ ${node.attrs.size}</span>`
      
      return { dom }
    }
  },
})

interface TiptapEditorProps {
  content: any
  onChange: (content: any) => void
  onEditorReady?: (editor: any) => void
}

export function TiptapEditor({ content, onChange, onEditorReady }: TiptapEditorProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageCount, setImageCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // CTA Button Dialog State
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false)
  const [buttonText, setButtonText] = useState('Jetzt starten')
  const [buttonHref, setButtonHref] = useState('')
  const [buttonColor, setButtonColor] = useState('#000000')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      ImageResize.configure({
        HTMLAttributes: {
          class: 'rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Schreibe deine E-Mail...',
      }),
      CtaButton,
      Spacer,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
      // Count images
      const count = editor.getJSON().content?.filter(
        (node: any) => node.type === 'image'
      ).length || 0
      setImageCount(count)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  useEffect(() => {
    if (editor) {
      const count = editor.getJSON().content?.filter(
        (node: any) => node.type === 'image'
      ).length || 0
      setImageCount(count)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL eingeben:', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const openImageDialog = () => {
    setImageUrl('')
    setImageDialogOpen(true)
  }

  const insertImage = (url: string) => {
    if (!url) return

    editor.chain().focus().setImage({ src: url }).run()
    setImageDialogOpen(false)
    setImageUrl('')
    toast.success('Bild eingefügt')
  }

  const openButtonDialog = () => {
    setButtonText('Jetzt starten')
    setButtonHref('')
    setButtonColor('#000000')
    setButtonDialogOpen(true)
  }

  const insertButton = () => {
    if (!buttonHref) {
      toast.error('Bitte eine URL eingeben')
      return
    }
    
    editor.chain().focus().insertContent({
      type: 'ctaButton',
      attrs: {
        text: buttonText,
        href: buttonHref,
        color: buttonColor,
      }
    }).run()
    
    setButtonDialogOpen(false)
    toast.success('Button eingefügt')
  }

  const insertSpacer = (size: 'small' | 'medium' | 'large') => {
    editor.chain().focus().insertContent({
      type: 'spacer',
      attrs: { size }
    }).run()
  }

  const insertDivider = () => {
    editor.chain().focus().setHorizontalRule().run()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPEG, PNG, GIF und WebP erlaubt')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß (max. 5MB)')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen')
      }

      insertImage(data.url)
    } catch (error: any) {
      toast.error(error.message || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rückgängig (Cmd+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Wiederholen (Cmd+Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn(editor.isActive('heading', { level: 1 }) && 'bg-muted')}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Überschrift 1</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn(editor.isActive('heading', { level: 2 }) && 'bg-muted')}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Überschrift 2</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(editor.isActive('bold') && 'bg-muted')}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fett (Cmd+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(editor.isActive('italic') && 'bg-muted')}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kursiv (Cmd+I)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={setLink}
              className={cn(editor.isActive('link') && 'bg-muted')}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Link einfügen</TooltipContent>
        </Tooltip>

        {editor.isActive('link') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Link entfernen</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(editor.isActive('bulletList') && 'bg-muted')}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Aufzählung</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(editor.isActive('orderedList') && 'bg-muted')}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nummerierte Liste</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={openImageDialog}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bild einfügen</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={openButtonDialog}
            >
              <MousePointerClick className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>CTA Button einfügen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={insertDivider}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Trennlinie einfügen</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoveVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Abstand einfügen</TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertSpacer('small')}>
              Klein (16px)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSpacer('medium')}>
              Mittel (32px)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSpacer('large')}>
              Groß (48px)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bild einfügen</DialogTitle>
            <DialogDescription>
              Lade ein Bild hoch oder gib eine URL ein
            </DialogDescription>
          </DialogHeader>

          {imageCount >= 2 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Du hast bereits {imageCount} Bilder. Zu viele Bilder können Spam-Filter auslösen.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Hochladen
              </TabsTrigger>
              <TabsTrigger value="url">
                <LinkIcon className="mr-2 h-4 w-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label>Bild auswählen</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, GIF oder WebP. Max. 5MB.
                </p>
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird hochgeladen...
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label>Bild-URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/bild.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={() => insertImage(imageUrl)} disabled={!imageUrl}>
                  Einfügen
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* CTA Button Dialog */}
      <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Button einfügen</DialogTitle>
            <DialogDescription>
              Erstelle einen Call-to-Action Button
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Button-Text</Label>
              <Input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="z.B. Jetzt anmelden"
              />
            </div>

            <div className="space-y-2">
              <Label>Link-URL</Label>
              <Input
                type="url"
                value={buttonHref}
                onChange={(e) => setButtonHref(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Farbe</Label>
              <RadioGroup value={buttonColor} onValueChange={setButtonColor} className="flex gap-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="#000000" id="black" />
                  <Label htmlFor="black" className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-black" />
                    Schwarz
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="#2563eb" id="blue" />
                  <Label htmlFor="blue" className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-600" />
                    Blau
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="#16a34a" id="green" />
                  <Label htmlFor="green" className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-600" />
                    Grün
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Vorschau:</p>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  display: 'inline-block',
                  backgroundColor: buttonColor,
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                {buttonText || 'Button'}
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setButtonDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={insertButton} disabled={!buttonText || !buttonHref}>
              Einfügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
