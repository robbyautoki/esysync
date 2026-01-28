import { NextRequest, NextResponse } from 'next/server'
import { checkSpamLocal, tiptapToPlainText, SpamCheckResult } from '@/lib/spam-check'

export const dynamic = 'force-dynamic'

interface PostmarkResponse {
  success: boolean
  score?: string
  rules?: Array<{ score: string; description: string }>
}

interface OpenAIIssue {
  problem: string
  suggestion: string
  severity: 'high' | 'medium' | 'low'
}

interface SpamCheckResponse {
  local: SpamCheckResult
  postmark?: {
    score: number
    rules: Array<{ score: number; description: string }>
  }
  openai?: {
    riskLevel: 'niedrig' | 'mittel' | 'hoch'
    issues: OpenAIIssue[]
    summary: string
  }
  overall: {
    score: number
    level: 'good' | 'warning' | 'bad'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subject, content } = await request.json()
    
    if (!subject && !content) {
      return NextResponse.json(
        { error: 'Betreff oder Inhalt erforderlich' },
        { status: 400 }
      )
    }
    
    const plainText = typeof content === 'string' 
      ? content 
      : tiptapToPlainText(content)
    
    // 1. Lokale Analyse (immer)
    const localResult = checkSpamLocal(subject || '', plainText)
    
    // 2. Postmark SpamAssassin Check
    let postmarkResult: SpamCheckResponse['postmark'] | undefined
    try {
      postmarkResult = await checkWithPostmark(subject, plainText)
    } catch (e) {
      console.error('Postmark check failed:', e)
    }
    
    // 3. OpenAI Analyse
    let openaiResult: SpamCheckResponse['openai'] | undefined
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        openaiResult = await analyzeWithOpenAI(subject, plainText, openaiKey)
      } catch (e) {
        console.error('OpenAI check failed:', e)
      }
    }
    
    // Gesamt-Score berechnen (Durchschnitt aus lokal + postmark)
    let overallScore = localResult.score
    if (postmarkResult) {
      // Postmark Score ist typisch 0-5, wir normalisieren auf 0-10
      const normalizedPostmark = Math.min(postmarkResult.score * 2, 10)
      overallScore = Math.round((localResult.score + normalizedPostmark) / 2)
    }
    
    const overallLevel = overallScore >= 6 ? 'bad' : overallScore >= 3 ? 'warning' : 'good'
    
    const response: SpamCheckResponse = {
      local: localResult,
      postmark: postmarkResult,
      openai: openaiResult,
      overall: {
        score: overallScore,
        level: overallLevel
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Spam check error:', error)
    return NextResponse.json(
      { error: 'Spam-Check fehlgeschlagen' },
      { status: 500 }
    )
  }
}

async function checkWithPostmark(
  subject: string, 
  body: string
): Promise<SpamCheckResponse['postmark']> {
  // Baue eine minimale E-Mail für SpamAssassin
  const rawEmail = `From: test@example.com
To: recipient@example.com
Subject: ${subject}
Content-Type: text/plain; charset=utf-8

${body}`

  const response = await fetch('https://spamcheck.postmarkapp.com/filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: rawEmail,
      options: 'long'
    })
  })
  
  if (!response.ok) {
    throw new Error('Postmark API error')
  }
  
  const data = await response.json() as PostmarkResponse
  
  if (!data.success) {
    throw new Error('Postmark check failed')
  }
  
  const score = parseFloat(data.score || '0')
  const rules = (data.rules || [])
    .filter(r => parseFloat(r.score) > 0)
    .slice(0, 5)
    .map(r => ({
      score: parseFloat(r.score),
      description: r.description
    }))
  
  return { score, rules }
}

async function analyzeWithOpenAI(
  subject: string,
  body: string,
  apiKey: string
): Promise<SpamCheckResponse['openai']> {
  const prompt = `Du bist ein E-Mail-Marketing-Experte. Analysiere diese deutsche Marketing-E-Mail auf Spam-Risiko.

Betreff: ${subject}

Inhalt:
${body.slice(0, 1500)}

Prüfe auf:
- Spam-Wörter (kostenlos, gratis, jetzt, dringend, garantiert, etc.)
- Übermäßige Großbuchstaben oder Ausrufezeichen
- Aggressive Verkaufssprache
- Fehlende Personalisierung
- Zu viele Links

Antworte NUR mit diesem JSON (keine Erklärung davor/danach):
{
  "riskLevel": "niedrig" | "mittel" | "hoch",
  "issues": [
    {
      "problem": "Kurze Beschreibung des Problems",
      "suggestion": "Konkrete Verbesserung oder Alternative",
      "severity": "high" | "medium" | "low"
    }
  ],
  "summary": "1 Satz Zusammenfassung auf Deutsch"
}

Wenn keine Probleme: leeres issues Array. Max 4 issues.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }
  
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  
  try {
    const parsed = JSON.parse(content)
    return {
      riskLevel: parsed.riskLevel || 'mittel',
      issues: parsed.issues || [],
      summary: parsed.summary || 'Keine Analyse verfügbar'
    }
  } catch {
    return {
      riskLevel: 'mittel',
      issues: [],
      summary: 'Analyse konnte nicht verarbeitet werden'
    }
  }
}
