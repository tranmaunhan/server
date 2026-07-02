FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache docker-cli

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY server.js ./
COPY public ./public

EXPOSE 8080

CMD ["npm", "start"]
