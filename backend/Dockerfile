FROM node:20-alpine


ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

WORKDIR /app

COPY package*.json ./
# RUN npm install
COPY package*.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]