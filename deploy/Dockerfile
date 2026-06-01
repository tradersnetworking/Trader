FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
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
RUN apk add --no-cache openssl wget
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server
COPY --from=build /app/server server
COPY --from=build /app/web/dist web/dist
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
RUN npm --workspace server run prisma:generate
COPY deploy/entrypoint.sh /entrypoint.sh
COPY deploy/entrypoint-postgres.sh /app/deploy/entrypoint-postgres.sh
RUN chmod +x /entrypoint.sh /app/deploy/entrypoint-postgres.sh
EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
