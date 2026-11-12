# Multi-stage production image for Angular 21 (no dev-server).
FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
ENV PORT=10000
ENV BACKEND_ORIGIN=http://app:8081
ENV NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_ORIGIN)$"
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/mediconnect-pro-frontend/browser/ /usr/share/nginx/html/
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:10000/ || exit 1
