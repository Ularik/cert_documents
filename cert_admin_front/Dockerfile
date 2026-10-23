# --- Этап 1: Установка зависимостей ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY dashboard/package*.json ./
RUN npm ci

# --- Этап 2: Сборка приложения ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY dashboard/ .

# Отключаем телеметрию во время сборки
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Этап 3: Финальный легковесный образ ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем системного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем только то, что реально нужно для запуска standalone-сервера
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]