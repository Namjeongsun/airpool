'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

const findRide = db.prepare('SELECT id FROM rides WHERE id = ?');
const isParticipant = db.prepare(
  'SELECT 1 FROM ride_participants WHERE ride_id = ? AND user_id = ?'
);
const listMessages = db.prepare(`
  SELECT m.id, m.ride_id, m.user_id, m.body, m.created_at,
         u.name AS user_name, u.company AS user_company, u.role AS user_role
  FROM messages m
  JOIN users u ON u.id = m.user_id
  WHERE m.ride_id = ?
  ORDER BY m.created_at ASC
`);
const insertMessage = db.prepare(`
  INSERT INTO messages (id, ride_id, user_id, body, created_at)
  VALUES (@id, @ride_id, @user_id, @body, @created_at)
`);

function messageToDTO(row) {
  return {
    id: row.id,
    rideId: row.ride_id,
    userId: row.user_id,
    userName: row.user_name,
    userCompany: row.user_company,
    userRole: row.user_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

function ensureParticipant(req, res) {
  const ride = findRide.get(req.params.id);
  if (!ride) {
    res.status(404).json({ ok: false, error: '합승을 찾을 수 없습니다' });
    return false;
  }
  if (!isParticipant.get(ride.id, req.user.id)) {
    res.status(403).json({ ok: false, error: '참여자만 채팅을 이용할 수 있습니다' });
    return false;
  }
  return true;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!ensureParticipant(req, res)) return;
    const rows = listMessages.all(req.params.id);
    return res.json({ ok: true, data: { messages: rows.map(messageToDTO) } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!ensureParticipant(req, res)) return;
    const errors = validateMessage(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors[0] });

    const row = {
      id: uuidv4(),
      ride_id: req.params.id,
      user_id: req.user.id,
      body: req.body.body.trim(),
      created_at: Date.now(),
    };
    insertMessage.run(row);

    const dto = messageToDTO({
      ...row,
      user_name: req.user.name,
      user_company: req.user.company,
      user_role: req.user.role,
    });
    return res.status(201).json({ ok: true, data: { message: dto } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
