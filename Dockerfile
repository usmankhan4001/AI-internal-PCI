FROM node:20-alpine

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the frontend
RUN cd frontend && npm install && npm run build

# Build the NestJS application
RUN npm run build

# Expose the API port
EXPOSE 3000

# Push DB schema and start the app
CMD npx prisma db push --accept-data-loss && npm run start:prod
