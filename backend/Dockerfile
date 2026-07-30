# Payload CMS v3 (Next.js host) - headless admin + API
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time args (a dummy DATABASE_URI is fine; no DB connection needed to build)
ARG PAYLOAD_SECRET=build-only-secret
ARG DATABASE_URI=postgresql://build:build@localhost:5432/build
ARG PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3001
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV DATABASE_URI=$DATABASE_URI
ENV PAYLOAD_PUBLIC_SERVER_URL=$PAYLOAD_PUBLIC_SERVER_URL
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV MEDIA_DIR=/app/media

COPY --from=builder /app ./
RUN mkdir -p /app/media

EXPOSE 3001
# Apply pending migrations (idempotent) before starting the server.
CMD ["sh", "-c", "npm run migrate && npm run start"]
