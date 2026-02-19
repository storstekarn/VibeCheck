# Use a standard Node LTS image on Debian bookworm.
# We install Playwright's Chromium via `npx playwright install --with-deps`
# so the browser revision EXACTLY matches the installed npm package version.
# The Microsoft Playwright image approach fails when the npm patch version
# doesn't match the image's pinned revision.
FROM node:20-bookworm-slim

WORKDIR /app

# --- Frontend: install deps & build ---
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# --- Backend: install deps ---
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

# Install Chromium + every system library it needs.
# --with-deps handles apt-get for libnspr4, libnss3, libgbm1, fonts, etc.
# This runs against the exact chromium revision pinned by the installed playwright package.
RUN cd backend && npx playwright install chromium --with-deps

# --- Backend: compile TypeScript ---
COPY backend/ ./backend/
RUN npm run build --prefix backend

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
