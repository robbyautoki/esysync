'use client'

import React from 'react'

// Email Preview Components für json-render
// Diese Komponenten rendern die E-Mail-Vorschau während AI generiert

interface ParagraphProps {
  text: string
}

export function Paragraph({ text }: ParagraphProps) {
  // Variable-Highlighting
  const parts = text.split(/(\{\{[^}]+\}\})/)
  
  return (
    <p className="text-sm leading-relaxed text-foreground">
      {parts.map((part, i) => 
        part.match(/^\{\{[^}]+\}\}$/) ? (
          <span key={i} className="bg-blue-100 text-blue-700 px-1 rounded text-xs font-mono">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

interface HeadingProps {
  level: '1' | '2'
  text: string
}

export function Heading({ level, text }: HeadingProps) {
  const className = level === '1' 
    ? 'text-xl font-bold text-foreground' 
    : 'text-lg font-semibold text-foreground'
  
  return level === '1' 
    ? <h1 className={className}>{text}</h1>
    : <h2 className={className}>{text}</h2>
}

interface ButtonProps {
  text: string
  href: string
  color: 'black' | 'blue' | 'green'
}

const BUTTON_STYLES: Record<string, string> = {
  black: 'bg-black text-white hover:bg-gray-800',
  blue: 'bg-blue-600 text-white hover:bg-blue-700',
  green: 'bg-green-600 text-white hover:bg-green-700'
}

export function Button({ text, href, color = 'black' }: ButtonProps) {
  return (
    <div className="py-1">
      <a 
        href={href}
        className={`inline-block px-6 py-3 rounded-md font-medium text-sm transition-colors ${BUTTON_STYLES[color] || BUTTON_STYLES.black}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {text}
      </a>
      <span className="ml-2 text-xs text-muted-foreground">→ {href}</span>
    </div>
  )
}

interface SpacerProps {
  size: 'small' | 'medium' | 'large'
}

const SPACER_SIZES: Record<string, string> = {
  small: 'h-4',
  medium: 'h-8',
  large: 'h-12'
}

export function Spacer({ size = 'medium' }: SpacerProps) {
  return (
    <div className={`${SPACER_SIZES[size]} flex items-center justify-center`}>
      <span className="text-[10px] text-muted-foreground/50">↕ {size}</span>
    </div>
  )
}

export function Divider() {
  return <hr className="border-t border-border my-2" />
}

interface BlockquoteProps {
  text: string
}

export function Blockquote({ text }: BlockquoteProps) {
  return (
    <blockquote className="border-l-4 border-primary/30 pl-4 py-2 italic text-muted-foreground text-sm">
      "{text}"
    </blockquote>
  )
}

interface BulletListProps {
  items: string[]
}

export function BulletList({ items }: BulletListProps) {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

interface ImageProps {
  src: string
  alt?: string
}

export function Image({ src, alt }: ImageProps) {
  return (
    <div className="py-2">
      <img 
        src={src} 
        alt={alt || ''} 
        className="max-w-full h-auto rounded-md border"
      />
    </div>
  )
}

// Component Map für json-render
export const emailComponents = {
  Paragraph,
  Heading,
  Button,
  Spacer,
  Divider,
  Blockquote,
  BulletList,
  Image
}

// Einfacher Renderer ohne json-render Library
interface EmailElement {
  key: string
  type: string
  props: Record<string, any>
}

interface EmailPreviewProps {
  elements: EmailElement[]
  className?: string
}

export function EmailPreview({ elements, className = '' }: EmailPreviewProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {elements.map((element) => {
        // Render based on component type
        switch (element.type) {
          case 'Paragraph':
            return <Paragraph key={element.key} text={element.props.text || ''} />
          case 'Heading':
            return <Heading key={element.key} level={element.props.level || '1'} text={element.props.text || ''} />
          case 'Button':
            return <Button key={element.key} text={element.props.text || ''} href={element.props.href || '#'} color={element.props.color || 'black'} />
          case 'Spacer':
            return <Spacer key={element.key} size={element.props.size || 'medium'} />
          case 'Divider':
            return <Divider key={element.key} />
          case 'Blockquote':
            return <Blockquote key={element.key} text={element.props.text || ''} />
          case 'BulletList':
            return <BulletList key={element.key} items={element.props.items || []} />
          case 'Image':
            return <Image key={element.key} src={element.props.src || ''} alt={element.props.alt} />
          default:
            return null
        }
      })}
    </div>
  )
}
