# =====================================================================
# Dockerfile — application Next.js (output: standalone). Multi-stage.
# =====================================================================

# ---- Dépendances ----------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Valeurs FACTICES uniquement pour passer la validation getEnv() au build
# (next build importe les modules de routes). AUCUNE connexion réseau au build :
# postgres.js se connecte de façon paresseuse. Les vraies valeurs sont injectées
# au RUNTIME par docker-compose.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV SESSION_SECRET=build_only_secret_build_only_secret_build_only
ENV APP_URL=https://alia.stellrstudio.fr
RUN npm run build

# ---- Runtime --------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001

# Sortie standalone : server.js + node_modules minimal, static et public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Dossier d'upload (monté en VOLUME pour la persistance) — possédé par nextjs.
RUN mkdir -p /app/storage-dev && chown nextjs:nodejs /app/storage-dev

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
