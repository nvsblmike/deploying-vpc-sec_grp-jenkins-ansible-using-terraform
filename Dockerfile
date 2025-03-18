# Use Bun base image
FROM oven/bun:1 as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun --bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1
# Copy standalone output and required files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Install only production dependencies
RUN bun install

COPY nginx.conf /etc/nginx/nginx.conf
# Expose port
EXPOSE 3111
ENV PORT=3111

# Start the application using the setup script
CMD ["bun", "server.js"]