# syntax=docker/dockerfile:1.6
FROM node:26-slim AS build
ENV CI=true
WORKDIR /app
RUN npm install -g pnpm@11.1.3
COPY . .
RUN pnpm install --frozen-lockfile
ARG SITE_URL=https://clidoc.ben3d.ca
ARG BASE_URL=/
ENV SITE_URL=${SITE_URL} BASE_URL=${BASE_URL}
RUN pnpm docs:build

FROM nginx:1.29-alpine
COPY packages/website/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/website/build /usr/share/nginx/html
EXPOSE 8080
