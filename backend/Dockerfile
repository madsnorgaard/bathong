# Payload CMS v3 (Next.js host) - headless admin + API
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time-only values: the config fails fast on missing env, but no DB
# connection is needed to build. Scoped to this stage (no ENV, no ARG default
# leaks into the runner); the runner gets real values from the runtime
# environment only.
ARG PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3001
RUN PAYLOAD_SECRET=build-only-secret \
    DATABASE_URI=postgresql://build:build@localhost:5432/build \
    PAYLOAD_PUBLIC_SERVER_URL=$PAYLOAD_PUBLIC_SERVER_URL \
    npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV MEDIA_DIR=/app/media

COPY --from=builder --chown=node:node /app ./
RUN mkdir -p /app/media && chown node:node /app/media
USER node

EXPOSE 3001
# Apply pending migrations (idempotent) before starting the server.
CMD ["sh", "-c", "npm run migrate && npm run start"]
