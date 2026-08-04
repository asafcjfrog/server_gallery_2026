# Use the base image from Artifactory
FROM productdemo.jfrog.io/gartner-docker/jfrog/demo-security:latest

# Install Node.js and npm, plus gcompat so the glibc-linked onnxruntime-node
# native binding (used to run the flan-t5-small model) works on musl/Alpine
RUN apk add --no-cache nodejs npm gcompat libstdc++

# Set the working directory
WORKDIR /app

# Copy the application source code
COPY . .

# Copy the CycloneDX SBOM file into the image
#COPY bom.json .

# Install dependencies
RUN npm install

# Bake the google/flan-t5-small model (ONNX build) into the image at build time
RUN node scripts/download-model.js

# Set the default command
CMD ["npm", "start"]
