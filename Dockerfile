# syntax=docker/dockerfile:1

# Use the base image from Artifactory
FROM productdemo.jfrog.io/gartner-docker/jfrog/demo-security:latest

# Resolve model downloads through Artifactory's huggingfaceml remote repo
# (instead of huggingface.co directly) so Artifactory/Xray attribute the
# resulting artifact to a recognized Hugging Face package, not just an
# anonymous binary blob it happens to recognize by file format.
ARG HF_ENDPOINT=https://huggingface.co
ENV HF_ENDPOINT=$HF_ENDPOINT
# Cold-cache fetches through the Artifactory proxy (first request mirrors the
# file from the Hub) can be slow, so give the client plenty of headroom.
ENV HF_HUB_ETAG_TIMEOUT=86400
ENV HF_HUB_DOWNLOAD_TIMEOUT=86400

# Install Node.js/npm (for the app) and Python/pip (for huggingface_hub, the
# only client Artifactory's huggingfaceml integration reliably recognizes —
# it downloads every file in the repo and preserves the Hub's own content
# hashes/commit metadata, which a raw HTTP fetch of hand-picked files does not).
# The base image's own Alpine repo (v3.15) only has Node 16, too old for this
# app (needs Node >=18), so pull pinned versions from a newer Alpine repo.
RUN apk add --no-cache 'nodejs=20.15.1-r0' 'npm=10.2.5-r0' ca-certificates python3 py3-pip \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/main \
    --repository=https://dl-cdn.alpinelinux.org/alpine/v3.19/community

# huggingface_hub alone (no torch/transformers) is enough to download and
# cache model files, so it stays lightweight.
RUN pip install --no-cache-dir --break-system-packages huggingface_hub

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

# Bake the google/flan-t5-small model into the image at build time via the
# Hugging Face Python client. The access token is passed as a build secret
# (not a build-arg/ENV) so it doesn't get baked into the image's layer history.
RUN --mount=type=secret,id=hf_token,env=HF_TOKEN \
    python3 scripts/download_model.py

# Set the default command
CMD ["npm", "start"]
