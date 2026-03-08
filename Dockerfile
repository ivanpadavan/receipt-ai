# Use Node.js 24 as the base image for the build stage
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Env
ARG OPENROUTER_API_KEY
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY

ARG OPENROUTER_API_MODEL
ENV OPENROUTER_API_MODEL=$OPENROUTER_API_MODEL
# Database connection
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

ARG DIRECT_URL
ENV DIRECT_URL=$DIRECT_URL
#Supabase client
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL

ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

ARG SUPABASE_SECRET_KEY
ENV SUPABASE_SECRET_KEY=$SUPABASE_SECRET_KEY
# OAuth providers
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
# Hawk
ARG NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN
ENV NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN=$NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN

# Install pnpm
RUN npm install -g pnpm@10.25.0

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the application code
COPY . .

# Run lifecycle scripts after the full project context is available
RUN pnpm rebuild

# Build the Next.js application
RUN pnpm build

# Use Node.js 24 for the production stage
FROM node:24-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user to run the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV PORT=80

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
