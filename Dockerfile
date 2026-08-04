# syntax=docker/dockerfile:1

# Use the base image from Artifactory
FROM productdemo.jfrog.io/gartner-docker/jfrog/demo-security:latest

# Resolve model downloads through Artifactory's huggingfaceml remote repo
# (instead of huggingface.co directly) so Artifactory/Xray attribute the
# resulting artifact to a recognized Hugging Face package, not just an
# anonymous binary blob it happens to recognize by file format.
ARG HF_ENDPOINT=https://huggingface.co
ENV HF_ENDPOINT=$HF_ENDPOINT

# Install Node.js and npm. The base image's own Alpine repo (v3.15) only has
# Node 16, which is too old for @huggingface/transformers (needs Node >=18 for
# global fetch/structuredClone), so pull pinned versions from a newer Alpine repo.
RUN apk add --no-cache 'nodejs=20.15.1-r0' 'npm=10.2.5-r0' ca-certificates \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/main \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/community

# Node bundles its own (older) root CA list instead of using the OS store, so
# HTTPS requests to hosts whose CA isn't in that bundled list (e.g. huggingface.co)
# fail with "unable to get local issuer certificate" even though curl succeeds.
# Point Node at the system's up-to-date ca-certificates bundle instead.
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Set the working directory
WORKDIR /app

# Copy the application source code
COPY . .

# Copy the CycloneDX SBOM file into the image
#COPY bom.json .

# Install dependencies
RUN npm install

# Bake the google/flan-t5-small model (ONNX build) into the image at build time.
# Credentials for the Artifactory remote repo are passed as build secrets
# (not build-args/ENV) so they don't get baked into the image's layer history.
RUN --mount=type=secret,id=jf_user,env=JF_USER \
    --mount=type=secret,id=jf_password,env=JF_PASSWORD \
    node scripts/download-model.js

# Set the default command
CMD ["npm", "start"]
