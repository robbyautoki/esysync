import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

interface CompanyProfile {
  // Basis
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
  
  // Brand Voice Guide
  brandPersonality?: string
  coreValues?: string
  missionStatement?: string
  
  // Zielgruppen-Verständnis
  audiencePainPoints?: string
  audienceDesires?: string
  audienceLanguage?: string
  
  // Produkt/Service Details
  mainOfferings?: string
  uniqueSellingPoints?: string
  pricingInfo?: string
  
  // Social Proof
  customerCount?: string
  successStories?: string
  awardsCredentials?: string
  
  // Kommunikationsstil
  examplePhrases?: string
  wordsToAvoid?: string
  preferredCTAs?: string
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
  
  // Erweiterte Liste von Unterseiten
  const subPages = [
    // Über uns
    '/about', '/ueber-uns', '/about-us', '/team', '/unternehmen', '/wir',
    // Produkte/Services
    '/produkte', '/products', '/services', '/leistungen', '/angebot', '/loesungen', '/solutions',
    // Preise
    '/preise', '/pricing', '/tarife', '/pakete',
    // Referenzen/Kunden
    '/referenzen', '/kunden', '/customers', '/testimonials', '/erfolge', '/case-studies',
    // Kontakt/Impressum (für Firmendaten)
    '/kontakt', '/contact', '/impressum',
    // FAQ
    '/faq', '/hilfe', '/help',
  ]
  
  for (const page of subPages) {
    try {
      const pageUrl = `${url.origin}${page}`
      const content = await fetchWebsiteContent(pageUrl)
      if (content && content.length > 100) {
        contents.push(`${page.toUpperCase()}:\n${content.substring(0, 4000)}`)
      }
    } catch {
      // Ignorieren
    }
  }
  
  return contents.join('\n\n---\n\n').substring(0, 40000)
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

    // OpenAI analysieren lassen mit GPT-5.2
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Markenanalyse und Brand Voice. Analysiere Websites GRÜNDLICH und erstelle ein umfassendes Unternehmensprofil.

WICHTIG: Schreibe zu JEDEM Feld ausführlich (mindestens 2-3 Sätze wo sinnvoll). Das Profil wird für E-Mail-Marketing genutzt, daher brauchen wir tiefe Einblicke.

Antworte NUR mit validem JSON im folgenden Format:
{
  "companyName": "Offizieller Firmenname",
  "industry": "Branche mit Details (z.B. 'SaaS - Marketing Automation für E-Commerce')",
  "targetAudience": "Detaillierte Zielgruppe mit Eigenschaften (z.B. 'B2B Marketing-Manager in KMUs mit 10-50 Mitarbeitern, die ihre Newsletter-Prozesse automatisieren wollen')",
  "tone": "Empfohlener Ton für E-Mails basierend auf der Website-Sprache (z.B. 'Locker-professionell, duzt die Kunden, nutzt gelegentlich Emojis, direkt und auf den Punkt')",
  
  "brandPersonality": "Wie wirkt das Unternehmen? Welche Persönlichkeit strahlt es aus? (z.B. 'Innovativ und modern, aber bodenständig. Wie ein kompetenter Freund, der komplexe Dinge einfach erklärt.')",
  "coreValues": "Welche Werte sind erkennbar? Was ist dem Unternehmen wichtig? (z.B. 'Einfachheit, Kundenorientierung, Transparenz bei Preisen, Made in Germany')",
  "missionStatement": "Was ist das übergeordnete Ziel/Mission des Unternehmens?",
  
  "audiencePainPoints": "Welche konkreten Probleme haben die Kunden, die das Unternehmen löst? (z.B. 'Zu wenig Zeit für Marketing, komplizierte Tools, keine Ahnung von E-Mail-Design, hohe Kosten bei Agenturen')",
  "audienceDesires": "Was wollen die Kunden erreichen? Ihre Träume und Ziele. (z.B. 'Mehr Umsatz mit weniger Aufwand, professionell wirken, Kunden automatisch binden')",
  "audienceLanguage": "Wie spricht die Zielgruppe? Welche Begriffe nutzt sie? (z.B. 'Nutzt Marketing-Buzzwords, spricht von ROI und Conversion, mag klare Zahlen')",
  
  "mainOfferings": "Was wird konkret angeboten? Alle Produkte/Services mit kurzer Beschreibung.",
  "uniqueSellingPoints": "Was macht das Unternehmen einzigartig? Warum sollte man hier kaufen statt bei der Konkurrenz?",
  "pricingInfo": "Preisinfos falls verfügbar (z.B. 'Ab 29€/Monat, kostenlose Testphase, keine Einrichtungsgebühr')",
  
  "customerCount": "Kundenzahlen falls erwähnt (z.B. '500+ Unternehmen', '10.000 Newsletter pro Tag')",
  "successStories": "Konkrete Erfolgsgeschichten oder Testimonials von der Website",
  "awardsCredentials": "Auszeichnungen, Zertifizierungen, Partnerschaften (z.B. 'TÜV zertifiziert, Google Partner, Top 10 Newsletter Tool 2025')",
  
  "examplePhrases": "3-5 typische Sätze/Phrasen von der Website die den Stil zeigen (z.B. \"'Lass uns das anpacken', 'Klingt gut?', 'Einfach. Schnell. Effektiv.'\")",
  "wordsToAvoid": "Wörter die das Unternehmen vermutlich nicht nutzen würde basierend auf dem Stil (z.B. 'billig, kompliziert, Problem, leider')",
  "preferredCTAs": "Typische Call-to-Actions von der Website (z.B. 'Jetzt kostenlos testen, Demo buchen, Mehr erfahren')"
}

Wenn du zu einem Feld nichts findest, schreibe eine sinnvolle Vermutung basierend auf dem Gesamtbild oder lasse das Feld leer.`
          },
          {
            role: 'user',
            content: `Analysiere diese Website GRÜNDLICH und erstelle ein vollständiges Unternehmensprofil für E-Mail-Marketing:\n\nURL: ${url}\n\nWebsite-Inhalte:\n${websiteContent}`
          }
        ],
        temperature: 0.4,
        max_tokens: 3000
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
