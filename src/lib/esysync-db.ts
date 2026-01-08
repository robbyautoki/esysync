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
  firstname: string
  lastname: string
  email: string
  isverified: boolean
}

export async function getEsySyncUsers(): Promise<EsySyncUser[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT id, firstname, lastname, email, isverified 
      FROM "User" 
      ORDER BY id DESC
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
