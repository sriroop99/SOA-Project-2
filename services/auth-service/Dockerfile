FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/auth-service/package*.json ./services/auth-service/
RUN npm ci
COPY services/shared ./services/shared
COPY services/auth-service ./services/auth-service

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=5001
EXPOSE 5001
CMD ["node", "--loader", "tsx", "services/auth-service/src/server.ts"]
