# Use the base image from Artifactory
FROM productdemo.jfrog.io/gartner-docker/jfrog/demo-security:latest

# Install Node.js and npm. The base image's own Alpine repo (v3.15) only has
# Node 16, which is too old for @huggingface/transformers (needs Node >=18 for
# global fetch/structuredClone), so pull pinned versions from a newer Alpine repo.
RUN apk add --no-cache 'nodejs=20.15.1-r0' 'npm=10.2.5-r0' \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/main \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/community

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
