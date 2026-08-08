FROM node:20-alpine

WORKDIR /app

# bcrypt ships native bindings; keep build tools available for Alpine musl installs
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY . .
RUN mkdir -p uploads/tickets \
  && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
