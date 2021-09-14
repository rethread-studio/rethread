FROM node:15-slim

ENV SERVER_PORT 3000
ENV SCREEN_PORT 3500
EXPOSE $SERVER_PORT
EXPOSE $SCREEN_PORT

WORKDIR /app

RUN npm install pm2 -g
RUN pm2 install typescript

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY ecosystem.config.js .
COPY config.ts .
COPY server .
COPY screen .

CMD [ "pm2-runtime", "ecosystem.config.js"]