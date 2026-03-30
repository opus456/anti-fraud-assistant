const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'anti-fraud-change-this-in-production';

/**
 * Verify a JWT token and return the decoded payload.
 *
 * @param {string} token – the raw JWT string
 * @returns {object} decoded payload (e.g. { userId, role, iat, exp })
 * @throws {Error} if the token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY);
}

/**
 * Express middleware that validates the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired token: ' + err.message });
  }
}

module.exports = { verifyToken, authMiddleware };
