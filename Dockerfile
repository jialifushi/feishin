# --- Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package.json first to cache node_modules
COPY package.json pnpm-lock.yaml .npmrc ./

RUN npm install -g pnpm

# Install dependencies, avoiding scripts to ensure cross-platform safety
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy code
COPY . .

# Perform web build
RUN pnpm run build:web

# --- Production stage
FROM nginxinc/nginx-unprivileged:alpine-slim

# Copy build artifacts
COPY --chown=nginx:nginx --from=builder /app/out/web /usr/share/nginx/html

# Copy configuration templates
COPY --chown=nginx:nginx ./settings.js.template /etc/nginx/templates/settings.js.template
COPY --chown=nginx:nginx ng.conf.template /etc/nginx/templates/default.conf.template

# Default Environment Variables
ENV SERVER_LOCK=false \
    SERVER_NAME="" \
    SERVER_TYPE="" \
    SERVER_URL="" \
    REMOTE_URL="" \
    LEGACY_AUTHENTICATION="" \
    ANALYTICS_DISABLED="" \
    PUBLIC_PATH="/" \
    WEB_TITLE="HMusic" \
    ALLOW_CODE="" \
    MULTI_SERVER=false \
    SERVER_URL1="" SERVER_TYPE1="" WEB_TITLE1="" USERNAME1="" PASSWORD1="" \
    SERVER_URL2="" SERVER_TYPE2="" WEB_TITLE2="" USERNAME2="" PASSWORD2="" \
    SERVER_URL3="" SERVER_TYPE3="" WEB_TITLE3="" USERNAME3="" PASSWORD3="" \
    SERVER_URL4="" SERVER_TYPE4="" WEB_TITLE4="" USERNAME4="" PASSWORD4="" \
    SERVER_URL5="" SERVER_TYPE5="" WEB_TITLE5="" USERNAME5="" PASSWORD5=""

EXPOSE 9180
CMD ["nginx", "-g", "daemon off;"]
