FROM node:22-alpine3.19
WORKDIR /app
COPY package*.json ./
COPY . .
EXPOSE 3000
RUN npm ci --omit=dev
CMD ["npm", "start"]