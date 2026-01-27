import { db } from './db'

// Warmup Schedule basierend auf Resend's offizieller Empfehlung
// Quelle: https://resend.com/docs/knowledge-base/warming-up
// Für neue Subdomains bei Newsletter (Opt-in Subscriber, nicht Cold Outreach)
// Das Limit erhöht sich basierend auf tatsächlichen Sende-Tagen, nicht Kalender-Tagen
const WARMUP_SCHEDULE = [
  { maxDay: 3, limit: 300 },   // Tag 1-3: 300/Tag (Resend: 150-400)
  { maxDay: 7, limit: 1000 },  // Tag 4-7: 1.000/Tag (Resend: 700-2.000)
] as const

const WARMUP_DURATION_DAYS = 7

export interface WarmupStatus {
  enabled: boolean
  startDate: Date
  currentDay: number // Anzahl aktiver Sende-Tage
  totalDays: number
  dailyLimit: number | null // null = unlimited
  sentToday: number
  remaining: number | null // null = unlimited
  isComplete: boolean
  nextLimitIncrease: { inDays: number; newLimit: number } | null
}

export async function getOrCreateSettings() {
  let settings = await db.settings.findUnique({ where: { id: 'default' } })

  if (!settings) {
    settings = await db.settings.create({
      data: { id: 'default' }
    })
  }

  return settings
}

// Zählt die Anzahl der Tage mit E-Mail-Versand seit dem Startdatum
export async function getActiveSendingDays(startDate: Date): Promise<number> {
  // Hole alle EmailLog-Einträge seit dem Startdatum
  const logs = await db.emailLog.findMany({
    where: {
      sentAt: { gte: startDate }
    },
    select: { sentAt: true }
  })

  // Zähle eindeutige Tage
  const uniqueDays = new Set<string>()
  logs.forEach(log => {
    const dateStr = log.sentAt.toISOString().split('T')[0]
    uniqueDays.add(dateStr)
  })

  return uniqueDays.size
}

export function calculateDailyLimitFromActiveDays(activeDays: number): number | null {
  // Nach 7 aktiven Sende-Tagen: unbegrenzt
  if (activeDays >= WARMUP_DURATION_DAYS) {
    return null
  }

  // Finde das passende Limit basierend auf aktiven Tagen
  // +1 weil der heutige Tag auch zählt (wir senden ja heute)
  const effectiveDay = activeDays + 1

  for (const tier of WARMUP_SCHEDULE) {
    if (effectiveDay <= tier.maxDay) {
      return tier.limit
    }
  }

  return null // Unbegrenzt nach Schedule
}

export function getNextLimitIncreaseFromActiveDays(activeDays: number): { inDays: number; newLimit: number } | null {
  if (activeDays >= WARMUP_DURATION_DAYS) {
    return null
  }

  const effectiveDay = activeDays + 1

  for (const tier of WARMUP_SCHEDULE) {
    if (effectiveDay <= tier.maxDay) {
      const daysUntilNext = tier.maxDay - effectiveDay + 1
      const nextTierIndex = WARMUP_SCHEDULE.indexOf(tier) + 1
      const nextLimit = nextTierIndex < WARMUP_SCHEDULE.length
        ? WARMUP_SCHEDULE[nextTierIndex].limit
        : null

      if (nextLimit === null) {
        return { inDays: daysUntilNext, newLimit: -1 } // -1 = unlimited
      }
      return { inDays: daysUntilNext, newLimit: nextLimit }
    }
  }

  return null
}

export async function getSentTodayCount(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const count = await db.emailLog.count({
    where: {
      sentAt: {
        gte: today,
        lt: tomorrow
      }
    }
  })
  
  return count
}

export async function logEmailSent(leadId: string, subject: string) {
  await db.emailLog.create({
    data: {
      leadId,
      subject
    }
  })
}

export async function getWarmupStatus(): Promise<WarmupStatus> {
  const settings = await getOrCreateSettings()
  const sentToday = await getSentTodayCount()

  // Zähle aktive Sende-Tage seit dem Startdatum
  const activeDays = await getActiveSendingDays(settings.warmupStartDate)

  // Prüfe ob heute bereits gesendet wurde - wenn ja, zählt heute schon
  const todayStr = new Date().toISOString().split('T')[0]
  const startStr = settings.warmupStartDate.toISOString().split('T')[0]
  const todayCounts = sentToday > 0

  // Effektiver Tag: aktive Sende-Tage + 1 (für heute, wenn noch nicht gesendet)
  const currentDay = todayCounts ? activeDays : activeDays + 1

  const dailyLimit = settings.warmupEnabled
    ? calculateDailyLimitFromActiveDays(activeDays)
    : null

  const isComplete = activeDays >= WARMUP_DURATION_DAYS
  const remaining = dailyLimit !== null ? Math.max(0, dailyLimit - sentToday) : null

  const nextIncrease = settings.warmupEnabled && !isComplete
    ? getNextLimitIncreaseFromActiveDays(activeDays)
    : null

  return {
    enabled: settings.warmupEnabled,
    startDate: settings.warmupStartDate,
    currentDay: Math.min(currentDay, WARMUP_DURATION_DAYS),
    totalDays: WARMUP_DURATION_DAYS,
    dailyLimit,
    sentToday,
    remaining,
    isComplete,
    nextLimitIncrease: nextIncrease
  }
}

export async function canSendEmail(): Promise<{ allowed: boolean; reason?: string }> {
  const status = await getWarmupStatus()
  
  if (!status.enabled || status.isComplete) {
    return { allowed: true }
  }
  
  if (status.remaining !== null && status.remaining <= 0) {
    return { 
      allowed: false, 
      reason: `Tageslimit erreicht (${status.dailyLimit}/${status.dailyLimit})` 
    }
  }
  
  return { allowed: true }
}
