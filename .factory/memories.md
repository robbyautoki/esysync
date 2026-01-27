# EsySync Projekt-Wissen

## Architektur-Entscheidungen
- Route Groups: (dashboard) mit AppShell, (public) ohne
- Unsubscribe-Token: base64url encoding (nicht base64!)
- Cron-Job: 50 Leads pro Run, alle 2 Minuten
- Warmup: Tag 1-3 max 300/Tag, Tag 4-7 max 1000/Tag

## Bekannte Issues & Fixes
- [2026-01] base64 Token in URLs → base64url nutzen
- [2026-01] Unsubscribe Page zeigte Dashboard → (public) Route Group

## Wichtige Dateien
- `src/app/api/cron/process-sequences/route.ts` - Email-Versand Logic
- `src/lib/warmup.ts` - Warmup-Limits
- `src/app/api/unsubscribe/route.ts` - Abmelde-Handling
