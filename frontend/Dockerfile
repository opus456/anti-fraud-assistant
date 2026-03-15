# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx vite build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 默认代理到同网络下的 backend 服务，可在 docker run / compose 中覆盖
ENV BACKEND_UPSTREAM=http://backend:8000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
