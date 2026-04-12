FROM node:22-alpine AS deps
WORKDIR /app
COPY ui/package.json ui/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ui/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/site.yaml ./site.yaml
COPY registry/ ./registry/

USER 1001
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV REGISTRY_DIR=/app/registry

CMD ["node", "server.js"]
