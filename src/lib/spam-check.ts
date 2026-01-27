// Lokale Spam-Check Regeln (deutsche + englische Trigger-Wörter)

const SPAM_WORDS_HIGH = [
  // Geld & Finanzen
  'gratis', 'kostenlos', 'free', 'geschenk', 'gewinn', 'gewinnen', 'gewinner',
  'jackpot', 'lotterie', 'casino', 'kredit', 'schulden', 'bargeld', 'cash',
  'reich werden', 'vermögen', 'millionär', 'euro', 'dollar',
  // Dringlichkeit
  'dringend', 'urgent', 'sofort', 'jetzt', 'heute noch', 'letzte chance',
  'nur heute', 'begrenzt', 'limitiert', 'exklusiv', 'einmalig',
  // Versprechen
  'garantiert', 'garantie', '100%', 'risikofrei', 'kein risiko',
  'versprochen', 'sicher', 'bewährt', 'getestet',
  // Aktionen
  'klick hier', 'click here', 'jetzt kaufen', 'buy now', 'bestellen',
  'angebot', 'rabatt', 'discount', 'sale', 'sonderangebot', 'schnäppchen',
  // Spam-Klassiker
  'viagra', 'pharma', 'abnehmen', 'diät', 'weight loss', 'sex',
]

const SPAM_WORDS_MEDIUM = [
  'angebot', 'deal', 'sparen', 'save', 'bonus', 'prämie', 'promo',
  'aktion', 'neu', 'new', 'jetzt', 'now', 'hier', 'here',
  'info', 'information', 'wichtig', 'important', 'achtung', 'attention',
]

export interface SpamCheckResult {
  score: number // 0-10
  level: 'good' | 'warning' | 'bad'
  issues: SpamIssue[]
}

export interface SpamIssue {
  type: 'spam_word' | 'caps' | 'punctuation' | 'links' | 'short_content'
  message: string
  points: number
}

export function checkSpamLocal(subject: string, plainText: string): SpamCheckResult {
  const issues: SpamIssue[] = []
  let score = 0
  
  const fullText = `${subject} ${plainText}`.toLowerCase()
  const subjectLower = subject.toLowerCase()
  
  // 1. Spam-Wörter prüfen (HIGH = +2, MEDIUM = +1)
  for (const word of SPAM_WORDS_HIGH) {
    if (fullText.includes(word.toLowerCase())) {
      issues.push({
        type: 'spam_word',
        message: `"${word.toUpperCase()}" ist ein bekanntes Spam-Wort`,
        points: 2
      })
      score += 2
    }
  }
  
  // Nur erste 3 Medium-Wörter zählen
  let mediumCount = 0
  for (const word of SPAM_WORDS_MEDIUM) {
    if (fullText.includes(word.toLowerCase()) && mediumCount < 3) {
      if (!SPAM_WORDS_HIGH.some(hw => hw.toLowerCase() === word.toLowerCase())) {
        mediumCount++
        score += 0.5
      }
    }
  }
  if (mediumCount > 0) {
    issues.push({
      type: 'spam_word',
      message: `${mediumCount} Marketing-Wörter gefunden`,
      points: mediumCount * 0.5
    })
  }
  
  // 2. ALL CAPS Wörter im Betreff
  const capsWords = subject.match(/\b[A-ZÄÖÜ]{3,}\b/g) || []
  if (capsWords.length > 0) {
    const points = Math.min(capsWords.length, 3)
    issues.push({
      type: 'caps',
      message: `${capsWords.length} Wörter in GROSSBUCHSTABEN: ${capsWords.slice(0, 3).join(', ')}`,
      points
    })
    score += points
  }
  
  // 3. Übermäßige Satzzeichen
  const exclamationCount = (subject.match(/!/g) || []).length
  const questionCount = (subject.match(/\?/g) || []).length
  
  if (exclamationCount > 1) {
    const points = Math.min(exclamationCount - 1, 2)
    issues.push({
      type: 'punctuation',
      message: `${exclamationCount} Ausrufezeichen im Betreff`,
      points
    })
    score += points
  }
  
  if (questionCount > 2) {
    issues.push({
      type: 'punctuation',
      message: `${questionCount} Fragezeichen im Betreff`,
      points: 1
    })
    score += 1
  }
  
  // 4. Emojis im Betreff (leichte Warnung)
  // Einfache Emoji-Erkennung über Surrogate Pairs
  const emojiCount = (subject.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length
  if (emojiCount > 2) {
    issues.push({
      type: 'punctuation',
      message: `${emojiCount} Emojis im Betreff können problematisch sein`,
      points: 1
    })
    score += 1
  }
  
  // 5. Zu viele Links im Text
  const linkCount = (plainText.match(/https?:\/\//gi) || []).length
  if (linkCount > 5) {
    issues.push({
      type: 'links',
      message: `${linkCount} Links im Text (max. 5 empfohlen)`,
      points: 2
    })
    score += 2
  }
  
  // 6. Sehr kurzer Inhalt
  if (plainText.length < 50) {
    issues.push({
      type: 'short_content',
      message: 'Sehr kurzer E-Mail-Inhalt kann verdächtig wirken',
      points: 1
    })
    score += 1
  }
  
  // Score auf 0-10 begrenzen
  score = Math.min(Math.round(score), 10)
  
  // Level bestimmen
  let level: 'good' | 'warning' | 'bad' = 'good'
  if (score >= 6) level = 'bad'
  else if (score >= 3) level = 'warning'
  
  return { score, level, issues }
}

// Hilfsfunktion: TipTap JSON zu Plain Text
export function tiptapToPlainText(content: any): string {
  if (!content) return ''
  
  const extractText = (node: any): string => {
    if (!node) return ''
    
    if (node.type === 'text') {
      return node.text || ''
    }
    
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('')
    }
    
    if (node.type === 'paragraph' || node.type === 'heading') {
      const text = node.content ? node.content.map(extractText).join('') : ''
      return text + '\n'
    }
    
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return node.content ? node.content.map(extractText).join('') : ''
    }
    
    if (node.type === 'listItem') {
      const text = node.content ? node.content.map(extractText).join('') : ''
      return '• ' + text
    }
    
    return ''
  }
  
  return extractText(content).trim()
}
