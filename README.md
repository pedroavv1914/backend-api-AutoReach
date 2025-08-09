# Backend - Automação de Redes Sociais

API em NestJS com Prisma e PostgreSQL.

## Requisitos
- Node.js 18+
- Docker (para Postgres/Redis) recomendado

## Configuração
1. Copie `.env.example` para `.env` e ajuste as variáveis.
2. Suba Postgres e Redis (ver docker-compose na raiz do projeto).
3. Instale dependências e gere o client do Prisma.

## Scripts
- `npm run dev` — inicia em modo watch
- `npm run build` — build para `dist/`
- `npm run start` — executa build
- `npm run prisma:migrate` — cria/atualiza schema no banco
- `npm run prisma:studio` — UI do Prisma

## Endpoints
- `GET /api/health` — healthcheck

## Roadmap
- Auth (JWT + refresh)
- OAuth (Instagram/Twitter/LinkedIn)
- CRUD de posts + upload de mídia (Cloudinary)
- Scheduler (BullMQ) + Redis
- Métricas + relatórios (PDF)
- Webhooks e notificações
