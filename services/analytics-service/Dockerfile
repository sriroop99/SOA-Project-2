FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/analytics-service/package*.json ./services/analytics-service/
RUN npm ci
COPY services/shared ./services/shared
COPY services/analytics-service ./services/analytics-service

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
ENV ANALYTICS_SERVICE_PORT=5005
EXPOSE 5005
CMD ["node", "--loader", "tsx", "services/analytics-service/src/server.ts"]
