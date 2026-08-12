FROM node:20-alpine AS build

WORKDIR /app

# CRA memory-friendly flags. Raise V8 heap high so Docker/host RAM is the real ceiling
# (Node default ~2–4 GB often OOMs mid-minify even when the machine still has free RAM).
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV INLINE_RUNTIME_CHUNK=false
ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV CI=false
ENV BABEL_ENV=production
ENV NODE_ENV=production
ENV PUBLIC_URL=/
ENV UV_THREADPOOL_SIZE=1
ENV NODE_OPTIONS=--max-old-space-size=16384

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG REACT_APP_API_BASE_URL=
ARG REACT_APP_VERITAS_EDITION=community
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_VERITAS_EDITION=$REACT_APP_VERITAS_EDITION

# Single-threaded minify reduces peak RAM vs parallel Terser workers
RUN node --max-old-space-size=16384 ./scripts/cra-build.cjs

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
