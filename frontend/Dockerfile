# Nuxt 3 - public site
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NUXT_TELEMETRY_DISABLED=1
# Baked into the build: @nuxt/image's ipx allowlist and the /api/media alias
# derive from this at build time. Without it the artifact allowlists only
# localhost:3001 and production silently serves full-res originals.
ARG NUXT_PUBLIC_CMS_URL=http://localhost:3001
ENV NUXT_PUBLIC_CMS_URL=$NUXT_PUBLIC_CMS_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder --chown=node:node /app/.output ./.output
USER node

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
