FROM node:20-bookworm-slim

# procps provides the `ps` command — Crawlee calls it on startup for memory
# snapshots and immediately aborts if it gets ENOENT.
# ca-certificates is needed for Playwright's browser download over HTTPS.
RUN apt-get update && apt-get install -y --no-install-recommends \
      procps \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Frontend: install deps & build ---
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# --- Backend: install deps ---
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

# Install Chromium at the exact revision the npm package expects, plus every
# system library Chromium needs (libnspr4, libnss3, libgbm1, fonts, etc.).
# Playwright's --with-deps flag runs the distro-appropriate apt/yum commands.
RUN cd backend && npx playwright install chromium --with-deps

# --- Backend: compile TypeScript ---
COPY backend/ ./backend/
RUN npm run build --prefix backend

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
