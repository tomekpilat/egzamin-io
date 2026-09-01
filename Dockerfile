FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Keep the large, immutable CKE media library out of Vite's builder filesystem.
# Vite otherwise walks and copies nearly 300 MB of public assets while compiling
# the client bundle, which can make a small Coolify host swap or appear stuck.
FROM node:24-alpine AS cke-assets

WORKDIR /assets

COPY public/cke ./cke

FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY worker ./worker
COPY .openai ./.openai
COPY public/google-g-official.svg ./public/google-g-official.svg
COPY public/og.png ./public/og.png
COPY public/rodzic-i-uczen-nauka.png ./public/rodzic-i-uczen-nauka.png
COPY public/uczen-nauka-logowanie.png ./public/uczen-nauka-logowanie.png
COPY components.json next-env.d.ts next.config.ts postcss.config.mjs server.mjs tsconfig.json vite.config.ts ./

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
# Restore CKE images and recordings only after compilation. Vinext serves public
# files from dist/client in production.
COPY --from=cke-assets --chown=node:node /assets/cke ./dist/client/cke
COPY --from=builder --chown=node:node /app/server.mjs ./server.mjs
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

STOPSIGNAL SIGTERM

CMD ["node", "server.mjs"]
