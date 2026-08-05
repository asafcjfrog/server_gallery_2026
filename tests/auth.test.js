const { signAccessToken, signServiceToken, verifyToken } = require('../src/auth');

describe('user access tokens (RS256)', () => {
  it('signs and verifies a user access token', () => {
    const token = signAccessToken({ userId: 42 });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(42);
  });
});

describe('internal service tokens (HS256, shared-key)', () => {
  it('signs and verifies a service-to-service token', () => {
    const token = signServiceToken({ service: 'billing' });
    const decoded = verifyToken(token);
    expect(decoded.service).toBe('billing');
  });
});
