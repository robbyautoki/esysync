import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const subscribeSchema = z.object({
  formId: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1)
})

export async function POST(request: NextRequest) {
  // CORS headers for embedding
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  try {
    const body = await request.json()
    const data = subscribeSchema.parse(body)

    // Find the form
    const form = await db.signupForm.findUnique({
      where: { id: data.formId }
    })

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404, headers }
      )
    }

    // Check if email already exists
    let lead = await db.lead.findUnique({
      where: { email: data.email.toLowerCase() }
    })

    if (lead) {
      // Check if unsubscribed
      if (lead.status === 'UNSUBSCRIBED') {
        return NextResponse.json(
          { error: 'Diese E-Mail wurde abgemeldet', success: false },
          { status: 400, headers }
        )
      }
    } else {
      // Create new lead
      lead = await db.lead.create({
        data: {
          email: data.email.toLowerCase(),
          firstName: data.firstName
        }
      })
    }

    // Add to sequence if configured
    if (form.sequenceId) {
      // Check if already in sequence
      const existingState = await db.sequenceState.findUnique({
        where: {
          leadId_sequenceId: {
            leadId: lead.id,
            sequenceId: form.sequenceId
          }
        }
      })

      if (!existingState) {
        await db.sequenceState.create({
          data: {
            leadId: lead.id,
            sequenceId: form.sequenceId,
            status: 'ACTIVE'
          }
        })
      }
    }

    // Increment form submissions
    await db.signupForm.update({
      where: { id: form.id },
      data: { submissions: { increment: 1 } }
    })

    return NextResponse.json({
      success: true,
      message: form.successMessage
    }, { headers })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Daten', errors: error.errors },
        { status: 400, headers }
      )
    }
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500, headers }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
