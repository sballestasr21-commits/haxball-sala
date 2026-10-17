FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-noto-color-emoji ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY bot.js sala.js ./

RUN chown -R node:node /app
USER node
CMD ["node", "bot.js"]
