FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @iso-manager/api... --frozen-lockfile

COPY apps/api ./apps/api
RUN pnpm --filter @iso-manager/api build

FROM base AS runtime
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @iso-manager/api --prod --frozen-lockfile

COPY --from=build /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
