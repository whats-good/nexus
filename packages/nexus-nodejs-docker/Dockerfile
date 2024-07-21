FROM node:lts-alpine3.20 as builder

COPY . /whatsgood
WORKDIR /whatsgood/packages/nexus-nodejs-docker

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build:turbo

FROM node:lts-alpine3.20

COPY --from=builder /whatsgood/packages/nexus-nodejs-docker /nexus
WORKDIR /nexus

ENV NODE_ENV=production 

# many libraries have implicit dependencies on NODE_ENV being set to production.
# at this point, it appears that the only safe value for NODE_ENV is production.
# Nexus won't make any references to NODE_ENV to understand if it's in development or production mode.

CMD [ "npm", "start"]