FROM node:lts-alpine3.20 as builder

COPY . /whatsgood
WORKDIR /whatsgood/packages/nexus-nodejs-docker

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build:turbo

CMD ["ls"]

FROM node:lts-alpine3.20

COPY --from=builder /whatsgood/packages/nexus-nodejs-docker /nexus
WORKDIR /nexus

CMD [ "npm", "start"]