# Stage 1: Build & Generate Migrations
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Generate migrations offline from the schema
RUN npm run db:generate
# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
# Copy the generated migrations to the production dist directory
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
