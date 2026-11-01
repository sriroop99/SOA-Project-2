FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY services/shared/package*.json ./services/shared/
COPY services/api-gateway/package*.json ./services/api-gateway/
RUN npm ci
COPY services/shared ./services/shared
COPY services/api-gateway ./services/api-gateway
RUN npm run build --workspace=@spendwise/shared || true

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
ENV GATEWAY_PORT=5000
EXPOSE 5000
CMD ["node", "--loader", "tsx", "services/api-gateway/src/server.ts"]
