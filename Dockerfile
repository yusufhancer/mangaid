# --- Stage 1: Build Frontend (Debian glibc to match final container) ---
FROM node:20-slim AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 2: Final Production Container ---
FROM python:3.10-slim

WORKDIR /app

# Install Node.js 20 & OpenCV runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend Code
COPY backend ./backend

# Copy Frontend Built Artifacts
COPY --from=frontend-builder /build/.next ./.next
COPY --from=frontend-builder /build/public ./public
COPY --from=frontend-builder /build/node_modules ./node_modules
COPY --from=frontend-builder /build/package.json ./package.json
COPY --from=frontend-builder /build/next.config.ts ./next.config.ts

# Create data directory for SQLite & Chapter Storage
RUN mkdir -p /app/data

COPY start.sh ./start.sh
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data
ENV DATABASE_URL=sqlite:////app/data/mangaid.db
ENV INTERNAL_BACKEND_URL=http://127.0.0.1:8000
ENV PORT=3000

EXPOSE 3000

CMD ["./start.sh"]
