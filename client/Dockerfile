# Stage 1: Build
# Build context must be the repo root (monorepo — lock file lives there)
FROM node:22-alpine AS build
WORKDIR /app

# Build-time env vars (Vite bakes these in at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy root workspace manifest + lock file, then workspace package.json files
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

COPY client ./client
RUN npm run build -w client

# Stage 2: Serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
