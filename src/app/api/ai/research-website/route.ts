import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

interface CompanyProfile {
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EsySync/1.0; +https://esysync.com)',
      },
    })
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    
    const html = await res.text()
    
    // HTML zu Text konvertieren (einfache Version)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000) // Limit
    
    return text
  } catch {
    return ''
  }
}

async function fetchDeepContent(baseUrl: string): Promise<string> {
  const contents: string[] = []
  const url = new URL(baseUrl)
  
  // Hauptseite
  const mainContent = await fetchWebsiteContent(baseUrl)
  contents.push(`HAUPTSEITE:\n${mainContent}`)
  
  // Versuche typische Unterseiten
  const subPages = ['/about', '/ueber-uns', '/produkte', '/products', '/services', '/leistungen']
  
  for (const page of subPages) {
    try {
      const pageUrl = `${url.origin}${page}`
      const content = await fetchWebsiteContent(pageUrl)
      if (content && content.length > 100) {
        contents.push(`${page.toUpperCase()}:\n${content.substring(0, 3000)}`)
      }
    } catch {
      // Ignorieren
    }
  }
  
  return contents.join('\n\n---\n\n').substring(0, 20000)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 })
  }

  try {
    const { url, deep } = await req.json() as { url: string; deep: boolean }

    if (!url) {
      return NextResponse.json({ error: 'URL erforderlich' }, { status: 400 })
    }

    // Website-Inhalte abrufen
    const websiteContent = deep 
      ? await fetchDeepContent(url)
      : await fetchWebsiteContent(url)

    if (!websiteContent || websiteContent.length < 50) {
      return NextResponse.json({ error: 'Website konnte nicht gelesen werden' }, { status: 400 })
    }

    // OpenAI analysieren lassen
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Du analysierst Websites und extrahierst Unternehmensinformationen.
Antworte NUR mit validem JSON im folgenden Format:
{
  "companyName": "Name des Unternehmens",
  "industry": "Branche (z.B. SaaS, E-Commerce, Agentur)",
  "targetAudience": "Zielgruppe (z.B. B2B Entscheider, Startups, KMU)",
  "tone": "Empfohlener Ton für E-Mails (z.B. professionell, locker, freundlich)",
  "products": "Hauptprodukte oder Dienstleistungen",
  "uniqueValue": "Was macht das Unternehmen besonders"
}

Sei präzise und leite die Infos aus dem Website-Inhalt ab.`
          },
          {
            role: 'user',
            content: `Analysiere diese Website und extrahiere Unternehmensinformationen:\n\nURL: ${url}\n\nInhalt:\n${websiteContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI API Fehler')
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // JSON parsen
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Konnte Profil nicht extrahieren')
    }

    const profile = JSON.parse(jsonMatch[0]) as CompanyProfile

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Research error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Analyse' },
      { status: 500 }
    )
  }
}
