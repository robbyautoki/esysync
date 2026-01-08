import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createFormSchema = z.object({
  name: z.string().min(1),
  sequenceId: z.string().optional(),
  buttonText: z.string().optional(),
  successMessage: z.string().optional()
})

export async function GET() {
  const forms = await db.signupForm.findMany({
    include: {
      sequence: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(forms)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createFormSchema.parse(body)

    const form = await db.signupForm.create({
      data: {
        name: data.name,
        sequenceId: data.sequenceId || null,
        buttonText: data.buttonText || 'Anmelden',
        successMessage: data.successMessage || 'Danke für deine Anmeldung!'
      }
    })

    return NextResponse.json(form)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Create form error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
