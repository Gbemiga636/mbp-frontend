const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN_SECRET || 'mbp-dev-secret-change-me';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || process.env.ADMIN_LOGIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_LOGIN_PASSWORD || '');

function signToken(email) {
  return jwt.sign({ sub: email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(String(token || '').replace(/^Bearer\s+/i, ''), JWT_SECRET);
  } catch {
    return null;
  }
}

function login(email, password) {
  const e = String(email || '').trim().toLowerCase();
  const p = String(password || '');
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Admin credentials are not configured on the server');
  }
  if (e !== ADMIN_EMAIL || p !== ADMIN_PASSWORD) {
    throw new Error('Invalid email or password');
  }
  return { token: signToken(e), email: e };
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const payload = verifyToken(header);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.admin = payload;
  return next();
}

module.exports = { signToken, verifyToken, login, requireAdmin };
