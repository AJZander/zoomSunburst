FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Copy the flare-2.json file from the original dataset
COPY public/flare-2.json public/

# Build the application
RUN npm run build

# Use nginx for serving the static files
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY --from=build /app/node_modules/d3/dist/d3.min.js /usr/share/nginx/html/d3.min.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]