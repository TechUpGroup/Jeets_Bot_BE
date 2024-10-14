FROM node:20-alpine as base
LABEL author="thinhhv <thin@thinhhv.com>"

# Workdir
WORKDIR /app

# ===========================
FROM base as builder1

# install git
RUN apk add --no-cache git

# Copy & install dependencies
COPY package.json yarn.lock ./
COPY patches ./patches
COPY src/common/abis ./src/common/abis
RUN yarn

# Copy source code & build
COPY . .
RUN yarn build

# ===========================
FROM base

# Install curl
RUN apk add --no-cache curl

# Copy source built BE
COPY ./public ./public
COPY package.json yarn.lock ./
COPY --from=builder1 /app/node_modules ./node_modules
COPY --from=builder1 /app/dist ./dist
COPY ./config/example.yaml ./config/default.yaml

# Env default
ENV NODE_ENV=production

# Export port
EXPOSE 8080

# Start app
CMD ["yarn", "start:prod"]
