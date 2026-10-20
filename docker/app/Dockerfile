FROM node:22.22.1-bookworm-slim AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY app ./app

# These public URLs are used by the browser, outside the Docker network.
ARG VITE_DEFAULT_DEPLOYMENT=local-v1
ARG VITE_RPC_URL=http://127.0.0.1:8545
ARG VITE_IPFS_API_URL=http://127.0.0.1:5001
ARG VITE_IPFS_GATEWAY=http://127.0.0.1:8080/ipfs/
ENV VITE_DEFAULT_DEPLOYMENT=$VITE_DEFAULT_DEPLOYMENT \
    VITE_RPC_URL=$VITE_RPC_URL \
    VITE_IPFS_API_URL=$VITE_IPFS_API_URL \
    VITE_IPFS_GATEWAY=$VITE_IPFS_GATEWAY
RUN npm run build

FROM nginx@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
COPY docker/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/app/dist/ /usr/share/nginx/html/
EXPOSE 80
