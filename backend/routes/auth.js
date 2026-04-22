'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { requireAuth, signToken, toUserDTO } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const router = express.Router();

const findByEmployeeId = db.prepare('SELECT * FROM users WHERE employee_id = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, name, company, role, employee_id, phone, password_hash, verified, rating, created_at)
  VALUES (@id, @name, @company, @role, @employee_id, @phone, @password_hash, @verified, @rating, @created_at)
`);

router.post('/register', async (req, res, next) => {
  try {
    const errors = validateRegister(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors[0] });

    const { name, company, role, employeeId, phone, password } = req.body;

    if (findByEmployeeId.get(employeeId)) {
      return res.status(409).json({ ok: false, error: '이미 가입된 사번입니다' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const row = {
      id: uuidv4(),
      name: name.trim(),
      company: company.trim(),
      role: role.trim(),
      employee_id: employeeId.trim(),
      phone: phone.trim(),
      password_hash: passwordHash,
      verified: 1,
      rating: 5.0,
      created_at: Date.now(),
    };
    insertUser.run(row);

    const user = toUserDTO(row);
    const token = signToken(user.id);
    return res.status(201).json({ ok: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const errors = validateLogin(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors[0] });

    const { employeeId, password } = req.body;
    const row = findByEmployeeId.get(employeeId.trim());
    if (!row) {
      return res.status(401).json({ ok: false, error: '사번 또는 비밀번호가 올바르지 않습니다' });
    }
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, error: '사번 또는 비밀번호가 올바르지 않습니다' });
    }

    const user = toUserDTO(row);
    const token = signToken(user.id);
    return res.json({ ok: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ ok: true, data: { user: req.user } });
});

module.exports = router;
