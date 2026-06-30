FROM node:22-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY ui/package.json ./ui/
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8088 \
    EBICS_MOCK_DB=/data/ebics-mock.sqlite \
    EBICS_UI_DIR=/app/ui/dist

RUN useradd --system --uid 10001 ebics && mkdir -p /data && chown ebics:ebics /data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/ui/dist ./ui/dist

USER ebics
EXPOSE 8088
VOLUME ["/data"]
CMD ["node", "server/dist/index.js"]
