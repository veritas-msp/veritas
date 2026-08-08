FROM node:20-alpine AS build

WORKDIR /app

# Low-RAM friendly CRA defaults (small VPS / CI).
# Override at build time: --build-arg NODE_MAX_OLD_SPACE_SIZE=768
ARG NODE_MAX_OLD_SPACE_SIZE=1536
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV INLINE_RUNTIME_CHUNK=false
ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV CI=false

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG REACT_APP_API_BASE_URL=
ARG REACT_APP_VERITAS_EDITION=community
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_VERITAS_EDITION=$REACT_APP_VERITAS_EDITION

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
