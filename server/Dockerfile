# Build context must be the repo root (monorepo — lock file lives there)
FROM node:18-alpine
WORKDIR /app

# Copy root workspace manifest + lock file, then workspace package.json files
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev

COPY server/src ./server/src
EXPOSE 3000
CMD ["node", "server/src/index.js"]
