# Okes API image — build context MUST be the repo root.
# Uses Turborepo prune so only @okes/api + its workspace deps are installed.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune the monorepo down to just what @okes/api needs.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo prune @okes/api --docker

# 2. Install pruned dependencies (cached unless manifests change).
FROM base AS install
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./

# 3. Runtime.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=install /app ./
EXPOSE 8080
CMD ["pnpm", "--filter", "@okes/api", "start"]
