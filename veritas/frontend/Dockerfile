FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_BASE_URL=
ARG REACT_APP_VERITAS_EDITION=community
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_VERITAS_EDITION=$REACT_APP_VERITAS_EDITION
# Avoid Create React App treating lint warnings as build errors in CI/Docker
ENV CI=false

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
