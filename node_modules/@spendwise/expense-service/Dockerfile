FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/expense-service/package*.json ./services/expense-service/
RUN npm ci
COPY services/shared ./services/shared
COPY services/expense-service ./services/expense-service

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 5002 5003
CMD ["node", "--loader", "tsx", "services/expense-service/src/server.ts"]
