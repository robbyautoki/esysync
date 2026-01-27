# EsySync Newsletter Tool

E-Mail-Marketing-Automation-Plattform für Lead-Management und automatisierte E-Mail-Sequenzen.

## Features

- :email: E-Mail-Sequenzen mit Drag & Drop Builder
- :busts_in_silhouette: Lead-Management mit CSV-Import
- :bar_chart: Open/Click Tracking & Analytics
- :fire: E-Mail-Warmup System
- :memo: Einbettbare Signup-Formulare
- :link: REST API für Integrationen

## Tech Stack

Next.js 14 | React 18 | PostgreSQL | Prisma | Resend | shadcn/ui

## Setup

### Voraussetzungen

- Node.js 18+
- PostgreSQL Datenbank (z.B. Neon)
- Resend Account

### Installation

```bash
npm install
cp .env.example .env  # Anpassen!
npx prisma db push
npm run dev
```

### Environment Variables

```env
DATABASE_URL=         # PostgreSQL Connection String
RESEND_API_KEY=       # Resend API Key
RESEND_DOMAIN=        # E-Mail Domain
NEXT_PUBLIC_APP_URL=  # App URL für Tracking
```

## Entwicklung

```bash
npm run dev           # Dev Server (localhost:3000)
npx prisma studio     # Datenbank GUI
npx prisma db push    # Schema sync
```

## Lizenz

Privates Projekt
