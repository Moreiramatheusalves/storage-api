FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build


FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views

RUN mkdir -p \
    /var/lib/storage-api/storage/apps \
    /var/lib/storage-api/data \
    /var/lib/storage-api/db \
    /var/lib/storage-api/tmp

EXPOSE 3999

CMD ["node", "dist/server.js"]