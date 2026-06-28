# Base image with Node.js + pnpm
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build the application
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Public (NEXT_PUBLIC_*) variables must be available at build time so Next.js can
# inline them into the client bundle. Pass these via docker compose build args.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID
ARG NEXT_PUBLIC_PAYPAL_PLAN_ID
ARG NEXTAUTH_URL

ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID
ENV NEXT_PUBLIC_PAYPAL_PLAN_ID=$NEXT_PUBLIC_PAYPAL_PLAN_ID
ENV NEXTAUTH_URL=$NEXTAUTH_URL

# Placeholder so the Prisma client can be constructed during `next build` page-data
# collection. No database connection is made at build time — only at runtime, where
# docker compose injects the real DATABASE_URL.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"

# Install dependencies (skip scripts so prisma generate runs after the schema is copied)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and build
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# Production image — runs the Next.js standalone server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install wget for the container healthcheck
RUN apk add --no-cache wget

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
