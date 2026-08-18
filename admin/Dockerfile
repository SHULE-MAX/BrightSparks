# ════════════════════════════════════════════════════════════════════════════
#  Bright Sparks admin dashboard
#
#  This exists to stop the build being guessed at. Railway's automatic
#  detection (Nixpacks) sees a Vite project and decides it must be a static
#  site, so it builds a Caddy image that serves dist/ and never runs
#  server.js. That breaks the dashboard: /config.js is generated at runtime by
#  the Node server, so without it the app loads but cannot reach Supabase.
#
#  A Dockerfile takes priority over Nixpacks, so what runs is exactly what is
#  written here.
# ════════════════════════════════════════════════════════════════════════════

# ── Stage 1: build the dashboard ────────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

# Copied first so this layer is only rebuilt when the dependencies change,
# not on every edit to the source.
COPY package.json package-lock.json ./

# --include=dev is deliberate: Vite, Tailwind and the React plugin are all
# devDependencies, and Railway's build environment sets npm to production mode,
# which would otherwise skip them and fail with "vite: not found".
RUN npm ci --include=dev

COPY . .
RUN npm run build


# ── Stage 2: the image that actually runs ───────────────────────────────────
# Only the built site, the server and the production dependencies ship, so the
# build toolchain is not carried into production.
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY --from=build /app/dist ./dist

# Railway provides PORT at runtime; server.js reads it and binds 0.0.0.0.
EXPOSE 3000

# Run as the unprivileged user that the node image already provides.
USER node

CMD ["node", "server.js"]
