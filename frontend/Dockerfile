# Stage 1: Build the Angular application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json /app/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . /app/

# Build the Angular application (outputs to dist/reqai-frontend/browser)
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy custom nginx configuration to handle routing redirects
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application files from builder stage
COPY --from=builder /app/dist/reqai-frontend/browser /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
