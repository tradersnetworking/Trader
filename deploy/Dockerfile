FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY server server
COPY web web
RUN npm --workspace server run prisma:generate
RUN npm --workspace web run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server
COPY --from=build /app/server server
COPY --from=build /app/web/dist web/dist
RUN npm --workspace server run prisma:generate
EXPOSE 4000
CMD ["node", "server/src/index.js"]
