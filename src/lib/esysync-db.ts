import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.ESYSYNC_HOST,
  port: parseInt(process.env.ESYSYNC_PORT || '5432'),
  user: process.env.ESYSYNC_USER,
  password: process.env.ESYSYNC_PASSWORD,
  database: process.env.ESYSYNC_DATABASE,
  ssl: false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface EsySyncUser {
  id: number
  name: string
  email: string
  created_at?: Date
}

export async function getEsySyncUsers(): Promise<EsySyncUser[]> {
  const client = await pool.connect()
  try {
    // First, let's see what tables exist
    const result = await client.query(`
      SELECT id, name, email, created_at 
      FROM users 
      ORDER BY created_at DESC
    `)
    return result.rows
  } finally {
    client.release()
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('EsySync DB connection error:', error)
    return false
  }
}
