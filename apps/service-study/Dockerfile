FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/service-study/ ./apps/service-study/

RUN npm install

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/apps/service-study
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/apps/service-study/package*.json ./
COPY --from=builder /app/apps/service-study/dist ./dist

RUN npm ci --omit=dev

RUN rm -rf ./node_modules/@soma-ms/shared
COPY --from=builder /app/packages/shared ./node_modules/@soma-ms/shared/

EXPOSE 3003
CMD ["npm", "start"]
