FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm install && npx prisma generate && npm prune --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4007
CMD ["node", "dist/main.js"]
