'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { expressjwt } = require('express-jwt');

const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, 'keys', 'private.pem'));
const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, 'keys', 'public.pem'));
const SERVICE_SHARED_SECRET = crypto.createSecretKey(PUBLIC_KEY);

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signAccessToken(payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), PRIVATE_KEY);
  return `${signingInput}.${b64url(signature)}`;
}

// Reuses the RSA public key file as the HMAC secret for internal
// service-to-service tokens instead of a dedicated shared secret.
function signServiceToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', SERVICE_SHARED_SECRET).update(signingInput).digest();
  return `${signingInput}.${b64url(signature)}`;
}

// User-facing routes only ever see RS256 access tokens.
const requireAccessToken = expressjwt({ secret: PUBLIC_KEY, algorithms: ['RS256'] });

// Internal routes accept either token kind, since service tokens predate
// the switch to RS256 access tokens.
const requireServiceToken = expressjwt({
  secret: async (_req, token) => (token && token.header && token.header.alg === 'HS256' ? SERVICE_SHARED_SECRET : PUBLIC_KEY),
  algorithms: ['RS256', 'HS256'],
});

module.exports = { signAccessToken, signServiceToken, requireAccessToken, requireServiceToken };
