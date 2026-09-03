FROM node:20-alpine

WORKDIR /app

# bcrypt ships native bindings; keep build tools available for Alpine musl installs
RUN apk add --no-cache python3 make g++

# Build context is the `veritas/` folder (see docker-compose.yml).
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY backend/ .
RUN mkdir -p uploads/tickets /RMM/Agents/windows/dist \
  && chmod +x docker-entrypoint.sh

# Optional prebuilt MSI (place VeritasAgent-Windows-Setup.msi under RMM/Agents/windows/dist before build).
# Runtime docker-compose also bind-mounts ./veritas/RMM → /RMM so updating the MSI does not require a rebuild.
COPY RMM/Agents/windows/dist/ /RMM/Agents/windows/dist/

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
