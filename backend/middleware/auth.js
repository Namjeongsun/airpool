'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

const getUserStmt = db.prepare(
  'SELECT id, name, company, role, employee_id, phone, verified, rating, created_at FROM users WHERE id = ?'
);

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: '로그인이 필요합니다' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserStmt.get(payload.sub);
    if (!user) {
      return res.status(401).json({ ok: false, error: '유효하지 않은 사용자입니다' });
    }
    req.user = toUserDTO(user);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: '인증 토큰이 유효하지 않습니다' });
  }
}

function toUserDTO(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    role: row.role,
    employeeId: row.employee_id,
    phone: row.phone,
    verified: !!row.verified,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

module.exports = { requireAuth, signToken, toUserDTO, JWT_SECRET };
