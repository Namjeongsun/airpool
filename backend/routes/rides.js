'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateRide, timeBucketRange } = require('../middleware/validate');

const router = express.Router();

const insertRide = db.prepare(`
  INSERT INTO rides (id, creator_id, airport, terminal, departure_area, departure_detail,
                     date, time, max_passengers, estimated_fare, note, status, created_at)
  VALUES (@id, @creator_id, @airport, @terminal, @departure_area, @departure_detail,
          @date, @time, @max_passengers, @estimated_fare, @note, @status, @created_at)
`);
const insertParticipant = db.prepare(
  'INSERT INTO ride_participants (ride_id, user_id, joined_at) VALUES (?, ?, ?)'
);
const findRide = db.prepare('SELECT * FROM rides WHERE id = ?');
const findParticipants = db.prepare(`
  SELECT u.id, u.name, u.company, u.role, u.rating, u.verified, rp.joined_at
  FROM ride_participants rp
  JOIN users u ON u.id = rp.user_id
  WHERE rp.ride_id = ?
  ORDER BY rp.joined_at ASC
`);
const countParticipants = db.prepare(
  'SELECT COUNT(*) AS c FROM ride_participants WHERE ride_id = ?'
);
const isParticipant = db.prepare(
  'SELECT 1 FROM ride_participants WHERE ride_id = ? AND user_id = ?'
);
const removeParticipant = db.prepare(
  'DELETE FROM ride_participants WHERE ride_id = ? AND user_id = ?'
);
const updateRideStatus = db.prepare('UPDATE rides SET status = ? WHERE id = ?');
const deleteRide = db.prepare('DELETE FROM rides WHERE id = ?');

function rideToDTO(row, participants) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    airport: row.airport,
    terminal: row.terminal,
    departureArea: row.departure_area,
    departureDetail: row.departure_detail,
    date: row.date,
    time: row.time,
    maxPassengers: row.max_passengers,
    estimatedFare: row.estimated_fare,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    participants: participants.map(p => ({
      id: p.id,
      name: p.name,
      company: p.company,
      role: p.role,
      rating: p.rating,
      verified: !!p.verified,
      joinedAt: p.joined_at,
    })),
  };
}

// GET /rides  (public list with filters). Placed BEFORE /rides/mine and /rides/:id.
router.get('/', async (req, res, next) => {
  try {
    const { airport, area, date, timeBucket } = req.query;
    const where = [];
    const params = [];

    if (airport) { where.push('airport = ?'); params.push(airport); }
    if (area)    { where.push('departure_area = ?'); params.push(area); }
    if (date)    { where.push('date = ?'); params.push(date); }

    const bucket = timeBucketRange(timeBucket);
    if (bucket) {
      where.push('time >= ? AND time < ?');
      params.push(bucket[0], bucket[1]);
    }

    const sql = `SELECT * FROM rides ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY date ASC, time ASC, created_at ASC`;
    const rows = db.prepare(sql).all(...params);
    const list = rows.map(r => rideToDTO(r, findParticipants.all(r.id)));
    return res.json({ ok: true, data: { rides: list } });
  } catch (err) {
    next(err);
  }
});

// GET /rides/mine  — must be defined BEFORE /rides/:id.
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT r.* FROM rides r
      JOIN ride_participants rp ON rp.ride_id = r.id
      WHERE rp.user_id = ?
      ORDER BY r.date ASC, r.time ASC
    `).all(req.user.id);
    const list = rows.map(r => rideToDTO(r, findParticipants.all(r.id)));
    return res.json({ ok: true, data: { rides: list } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const errors = validateRide(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors[0] });

    const now = Date.now();
    const row = {
      id: uuidv4(),
      creator_id: req.user.id,
      airport: req.body.airport,
      terminal: req.body.terminal ?? null,
      departure_area: req.body.departureArea.trim(),
      departure_detail: req.body.departureDetail.trim(),
      date: req.body.date,
      time: req.body.time,
      max_passengers: req.body.maxPassengers,
      estimated_fare: req.body.estimatedFare,
      note: (req.body.note || '').toString().slice(0, 500),
      status: 'recruiting',
      created_at: now,
    };

    const tx = db.transaction(() => {
      insertRide.run(row);
      insertParticipant.run(row.id, req.user.id, now);
    });
    tx();

    const participants = findParticipants.all(row.id);
    return res.status(201).json({ ok: true, data: { ride: rideToDTO(row, participants) } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = findRide.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: '합승을 찾을 수 없습니다' });
    const participants = findParticipants.all(row.id);
    return res.json({ ok: true, data: { ride: rideToDTO(row, participants) } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const row = findRide.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: '합승을 찾을 수 없습니다' });
    if (row.status !== 'recruiting') {
      return res.status(409).json({ ok: false, error: '모집이 마감되었습니다' });
    }
    if (isParticipant.get(row.id, req.user.id)) {
      return res.status(409).json({ ok: false, error: '이미 참여 중인 합승입니다' });
    }
    const count = countParticipants.get(row.id).c;
    if (count >= row.max_passengers) {
      return res.status(409).json({ ok: false, error: '모집이 마감되었습니다' });
    }

    const now = Date.now();
    const tx = db.transaction(() => {
      insertParticipant.run(row.id, req.user.id, now);
      if (count + 1 >= row.max_passengers) {
        updateRideStatus.run('full', row.id);
      }
    });
    tx();

    const fresh = findRide.get(row.id);
    const participants = findParticipants.all(row.id);
    return res.json({ ok: true, data: { ride: rideToDTO(fresh, participants) } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const row = findRide.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: '합승을 찾을 수 없습니다' });
    if (!isParticipant.get(row.id, req.user.id)) {
      return res.status(409).json({ ok: false, error: '참여하지 않은 합승입니다' });
    }
    if (row.creator_id === req.user.id) {
      return res.status(400).json({
        ok: false,
        error: '개설자는 합승을 떠날 수 없습니다. 합승을 삭제해주세요',
      });
    }

    const tx = db.transaction(() => {
      removeParticipant.run(row.id, req.user.id);
      if (row.status === 'full') updateRideStatus.run('recruiting', row.id);
    });
    tx();

    const fresh = findRide.get(row.id);
    const participants = findParticipants.all(row.id);
    return res.json({ ok: true, data: { ride: rideToDTO(fresh, participants) } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = findRide.get(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: '합승을 찾을 수 없습니다' });
    if (row.creator_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: '개설자만 삭제할 수 있습니다' });
    }
    deleteRide.run(row.id);
    return res.json({ ok: true, data: { id: row.id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
