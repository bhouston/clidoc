# syntax=docker/dockerfile:1.6
FROM node:26-slim AS build
ENV CI=true
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm docs:build

FROM nginx:1.29-alpine
COPY packages/website/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/website/build /usr/share/nginx/html
EXPOSE 8080
