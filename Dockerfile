FROM node:22-bookworm-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
# devDependencies ficam: o Prisma CLI e o tsx são usados em migrações, criação de admin e backup
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npm run build

# dados persistentes: banco em /data/app.db, backups em /data/backups
ENV DATABASE_URL="file:/data/app.db" BACKUP_DIR=/data/backups PORT=3000
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
# aplica migrações pendentes e inicia
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
