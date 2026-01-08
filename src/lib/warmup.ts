import { db } from './db'

// Warm-up schedule: Tag -> Limit
const WARMUP_SCHEDULE = [
  { maxDay: 7, limit: 10 },
  { maxDay: 14, limit: 20 },
  { maxDay: 21, limit: 35 },
  { maxDay: 28, limit: 50 },
  { maxDay: 35, limit: 75 },
  { maxDay: 42, limit: 100 },
] as const

const WARMUP_DURATION_DAYS = 42

export interface WarmupStatus {
  enabled: boolean
  startDate: Date
  currentDay: number
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

export function calculateDailyLimit(startDate: Date): number | null {
  const now = new Date()
  const diffTime = now.getTime() - startDate.getTime()
  const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  // Nach 42 Tagen: unbegrenzt
  if (daysSinceStart > WARMUP_DURATION_DAYS) {
    return null
  }
  
  // Finde das passende Limit
  for (const tier of WARMUP_SCHEDULE) {
    if (daysSinceStart <= tier.maxDay) {
      return tier.limit
    }
  }
  
  return null // Sollte nicht erreicht werden
}

export function getNextLimitIncrease(startDate: Date): { inDays: number; newLimit: number } | null {
  const now = new Date()
  const diffTime = now.getTime() - startDate.getTime()
  const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  if (daysSinceStart > WARMUP_DURATION_DAYS) {
    return null
  }
  
  for (const tier of WARMUP_SCHEDULE) {
    if (daysSinceStart <= tier.maxDay) {
      const daysUntilNext = tier.maxDay - daysSinceStart + 1
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
  
  const now = new Date()
  const diffTime = now.getTime() - settings.warmupStartDate.getTime()
  const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  const dailyLimit = settings.warmupEnabled 
    ? calculateDailyLimit(settings.warmupStartDate)
    : null
  
  const isComplete = currentDay > WARMUP_DURATION_DAYS
  const remaining = dailyLimit !== null ? Math.max(0, dailyLimit - sentToday) : null
  
  const nextIncrease = settings.warmupEnabled && !isComplete
    ? getNextLimitIncrease(settings.warmupStartDate)
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
