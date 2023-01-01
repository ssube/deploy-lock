FROM docker.artifacts.apextoaster.com/library/node:18

WORKDIR /app

# dependencies first, to invalidate other layers when version changes
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock

RUN yarn install --production

# copy build output
COPY out/src/ /app/out/src/

ENTRYPOINT [ "node", "/app/out/src/index.js" ]

