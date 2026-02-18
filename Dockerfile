# Use the official Playwright image — Chromium + all system deps pre-installed
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# --- Frontend: install deps & build ---
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# --- Backend: install deps & build ---
# Skip browser download — browsers are already in the image at /ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

COPY backend/ ./backend/
RUN npm run build --prefix backend

# Point Playwright to the pre-installed browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
