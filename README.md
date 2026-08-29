# FlowForge — AI Automation Workflows

Demo de orquestación de workflows con ejecución en tiempo real vía **Partykit**.

## Live

https://automation-workflows.vercel.app *(deploy pending)*

## Stack

- Next.js 16 · React 19 · Tailwind v4
- Partykit / partysocket — live run log compartido
- Servidor compartido: `portfolio-live-party.fonsi44.partykit.dev`

## Features

- Pipeline visual: Trigger → AI Agent → Transform → Notify
- Run workflow con steps animados en secuencia
- Live Run Log — todos los usuarios ven ejecuciones en tiempo real
- Presencia en ecosistema global del portfolio

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

← [Portfolio Hub](https://portfolio-hub-flax.vercel.app)
