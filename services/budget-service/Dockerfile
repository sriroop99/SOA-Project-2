FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/budget-service/package*.json ./services/budget-service/
RUN npm ci
COPY services/shared ./services/shared
COPY services/budget-service ./services/budget-service

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
ENV BUDGET_SERVICE_PORT=5004
EXPOSE 5004
CMD ["node", "--loader", "tsx", "services/budget-service/src/server.ts"]
