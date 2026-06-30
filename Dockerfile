FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server.mjs ./
COPY --from=build /app/api ./api
EXPOSE 3000
# 注意：.env.local 不应包含在镜像中。
# 运行时通过 -e 或 docker compose env_file 注入环境变量。
CMD ["node", "server.mjs"]
