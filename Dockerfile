FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV EGZAMINIO_DOCKER_BUILD=1

RUN npm run build

FROM dependencies AS production-dependencies

RUN npm prune --omit=dev

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    VINEXT_TRUST_PROXY=1

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server.mjs ./server.mjs
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

STOPSIGNAL SIGTERM

CMD ["node", "server.mjs"]
