import { db } from '@/lib/db'
import { FormsClient } from './forms-client'

export default async function FormsPage() {
  const [forms, sequences] = await Promise.all([
    db.signupForm.findMany({
      include: {
        sequence: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    db.sequence.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  return <FormsClient forms={forms} sequences={sequences} />
}
