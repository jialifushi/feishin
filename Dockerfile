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

# Perform web build with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"
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
    SERVER_URL="http://127.0.0.1" \
    REMOTE_URL="" \
    LEGACY_AUTHENTICATION="" \
    ANALYTICS_DISABLED="" \
    PUBLIC_PATH="/" \
    WEB_TITLE="HMusic" \
    ALLOW_CODE="" \
    ALLOW_CODE_a="" ALLOW_CODE_b="" ALLOW_CODE_c="" ALLOW_CODE_d="" ALLOW_CODE_e="" \
    ALLOW_CODE_f="" ALLOW_CODE_g="" ALLOW_CODE_h="" ALLOW_CODE_i="" ALLOW_CODE_j="" \
    MULTI_SERVER=false \
    SERVER_URL1="http://127.0.0.1" SERVER_TYPE1="" WEB_TITLE1="" USERNAME1="" PASSWORD1="" \
    ALLOW_CODE_a_USERNAME1="" ALLOW_CODE_a_PASSWORD1="" \
    ALLOW_CODE_b_USERNAME1="" ALLOW_CODE_b_PASSWORD1="" \
    ALLOW_CODE_c_USERNAME1="" ALLOW_CODE_c_PASSWORD1="" \
    ALLOW_CODE_d_USERNAME1="" ALLOW_CODE_d_PASSWORD1="" \
    ALLOW_CODE_e_USERNAME1="" ALLOW_CODE_e_PASSWORD1="" \
    ALLOW_CODE_f_USERNAME1="" ALLOW_CODE_f_PASSWORD1="" \
    ALLOW_CODE_g_USERNAME1="" ALLOW_CODE_g_PASSWORD1="" \
    ALLOW_CODE_h_USERNAME1="" ALLOW_CODE_h_PASSWORD1="" \
    ALLOW_CODE_i_USERNAME1="" ALLOW_CODE_i_PASSWORD1="" \
    ALLOW_CODE_j_USERNAME1="" ALLOW_CODE_j_PASSWORD1="" \
    SERVER_URL2="http://127.0.0.1" SERVER_TYPE2="" WEB_TITLE2="" USERNAME2="" PASSWORD2="" \
    ALLOW_CODE_a_USERNAME2="" ALLOW_CODE_a_PASSWORD2="" \
    ALLOW_CODE_b_USERNAME2="" ALLOW_CODE_b_PASSWORD2="" \
    ALLOW_CODE_c_USERNAME2="" ALLOW_CODE_c_PASSWORD2="" \
    ALLOW_CODE_d_USERNAME2="" ALLOW_CODE_d_PASSWORD2="" \
    ALLOW_CODE_e_USERNAME2="" ALLOW_CODE_e_PASSWORD2="" \
    ALLOW_CODE_f_USERNAME2="" ALLOW_CODE_f_PASSWORD2="" \
    ALLOW_CODE_g_USERNAME2="" ALLOW_CODE_g_PASSWORD2="" \
    ALLOW_CODE_h_USERNAME2="" ALLOW_CODE_h_PASSWORD2="" \
    ALLOW_CODE_i_USERNAME2="" ALLOW_CODE_i_PASSWORD2="" \
    ALLOW_CODE_j_USERNAME2="" ALLOW_CODE_j_PASSWORD2="" \
    SERVER_URL3="http://127.0.0.1" SERVER_TYPE3="" WEB_TITLE3="" USERNAME3="" PASSWORD3="" \
    ALLOW_CODE_a_USERNAME3="" ALLOW_CODE_a_PASSWORD3="" \
    ALLOW_CODE_b_USERNAME3="" ALLOW_CODE_b_PASSWORD3="" \
    ALLOW_CODE_c_USERNAME3="" ALLOW_CODE_c_PASSWORD3="" \
    ALLOW_CODE_d_USERNAME3="" ALLOW_CODE_d_PASSWORD3="" \
    ALLOW_CODE_e_USERNAME3="" ALLOW_CODE_e_PASSWORD3="" \
    ALLOW_CODE_f_USERNAME3="" ALLOW_CODE_f_PASSWORD3="" \
    ALLOW_CODE_g_USERNAME3="" ALLOW_CODE_g_PASSWORD3="" \
    ALLOW_CODE_h_USERNAME3="" ALLOW_CODE_h_PASSWORD3="" \
    ALLOW_CODE_i_USERNAME3="" ALLOW_CODE_i_PASSWORD3="" \
    ALLOW_CODE_j_USERNAME3="" ALLOW_CODE_j_PASSWORD3="" \
    SERVER_URL4="http://127.0.0.1" SERVER_TYPE4="" WEB_TITLE4="" USERNAME4="" PASSWORD4="" \
    ALLOW_CODE_a_USERNAME4="" ALLOW_CODE_a_PASSWORD4="" \
    ALLOW_CODE_b_USERNAME4="" ALLOW_CODE_b_PASSWORD4="" \
    ALLOW_CODE_c_USERNAME4="" ALLOW_CODE_c_PASSWORD4="" \
    ALLOW_CODE_d_USERNAME4="" ALLOW_CODE_d_PASSWORD4="" \
    ALLOW_CODE_e_USERNAME4="" ALLOW_CODE_e_PASSWORD4="" \
    ALLOW_CODE_f_USERNAME4="" ALLOW_CODE_f_PASSWORD4="" \
    ALLOW_CODE_g_USERNAME4="" ALLOW_CODE_g_PASSWORD4="" \
    ALLOW_CODE_h_USERNAME4="" ALLOW_CODE_h_PASSWORD4="" \
    ALLOW_CODE_i_USERNAME4="" ALLOW_CODE_i_PASSWORD4="" \
    ALLOW_CODE_j_USERNAME4="" ALLOW_CODE_j_PASSWORD4="" \
    SERVER_URL5="http://127.0.0.1" SERVER_TYPE5="" WEB_TITLE5="" USERNAME5="" PASSWORD5="" \
    ALLOW_CODE_a_USERNAME5="" ALLOW_CODE_a_PASSWORD5="" \
    ALLOW_CODE_b_USERNAME5="" ALLOW_CODE_b_PASSWORD5="" \
    ALLOW_CODE_c_USERNAME5="" ALLOW_CODE_c_PASSWORD5="" \
    ALLOW_CODE_d_USERNAME5="" ALLOW_CODE_d_PASSWORD5="" \
    ALLOW_CODE_e_USERNAME5="" ALLOW_CODE_e_PASSWORD5="" \
    ALLOW_CODE_f_USERNAME5="" ALLOW_CODE_f_PASSWORD5="" \
    ALLOW_CODE_g_USERNAME5="" ALLOW_CODE_g_PASSWORD5="" \
    ALLOW_CODE_h_USERNAME5="" ALLOW_CODE_h_PASSWORD5="" \
    ALLOW_CODE_i_USERNAME5="" ALLOW_CODE_i_PASSWORD5="" \
    ALLOW_CODE_j_USERNAME5="" ALLOW_CODE_j_PASSWORD5="" \
    WEBHOOK_URL="http://127.0.0.1" WEBHOOK_METHOD="POST" \
    WEBHOOK_HEADERS='{"Content-Type":"application/json"}' \
    WEBHOOK_TEMPLATE='{"content":"{{message}}"}' \
    BOT_TOKEN="" CHAT_ID=""

EXPOSE 9180
CMD ["nginx", "-g", "daemon off;"]
