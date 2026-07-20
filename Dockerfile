# Use the base image from Artifactory
FROM productdemo.jfrog.io/gartner-docker/jfrog/demo-security:latest

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

# Set the working directory
WORKDIR /app

# Copy the application source code
COPY . .

# Copy the CycloneDX SBOM file into the image
#COPY bom.json .

# Install dependencies
RUN npm install

# Set the default command
CMD ["npm", "start"]
