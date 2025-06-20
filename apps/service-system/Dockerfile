FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/service-system/ ./apps/service-system/

RUN npm install

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/apps/service-system
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/apps/service-system/package*.json ./
COPY --from=builder /app/apps/service-system/dist ./dist

RUN npm ci --omit=dev

RUN rm -rf ./node_modules/@soma-ms/shared
COPY --from=builder /app/packages/shared ./node_modules/@soma-ms/shared/

EXPOSE 3001
CMD ["npm", "start"]
