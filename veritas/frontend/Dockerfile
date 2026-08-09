FROM node:20-alpine AS build

WORKDIR /app

# Memory-friendly CRA settings. Do NOT cap --max-old-space-size:
# an artificial heap limit causes OOM even when the host still has RAM/swap.
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV INLINE_RUNTIME_CHUNK=false
ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV CI=false
ENV BABEL_ENV=production
ENV NODE_ENV=production
ENV PUBLIC_URL=/
ENV UV_THREADPOOL_SIZE=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG REACT_APP_API_BASE_URL=
ARG REACT_APP_VERITAS_EDITION=community
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_VERITAS_EDITION=$REACT_APP_VERITAS_EDITION

# Single-threaded minify reduces peak RAM vs parallel Terser workers
RUN node ./scripts/cra-build.cjs

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
