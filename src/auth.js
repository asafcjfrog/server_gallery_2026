'use strict';

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, 'keys', 'private.pem'));
const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, 'keys', 'public.pem'));

function signAccessToken(payload) {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '15m' });
}

// Reuses the RSA public key file as the HMAC secret for internal
// service-to-service tokens instead of a dedicated shared secret.
function signServiceToken(payload) {
  return jwt.sign(payload, PUBLIC_KEY, { algorithm: 'HS256', expiresIn: '5m' });
}

function verifyToken(token) {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256', 'HS256'] });
}

module.exports = { signAccessToken, signServiceToken, verifyToken };
