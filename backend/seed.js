'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const USERS = [
  { name: '김승아', company: '대한항공',   role: '객실승무원', employeeId: 'KE10001', phone: '010-1111-0001' },
  { name: '이지원', company: '대한항공',   role: '조종사',     employeeId: 'KE10002', phone: '010-1111-0002' },
  { name: '박수빈', company: '아시아나',   role: '객실승무원', employeeId: 'OZ20001', phone: '010-2222-0001' },
  { name: '정유나', company: '아시아나',   role: '지상직',     employeeId: 'OZ20002', phone: '010-2222-0002' },
  { name: '한가영', company: '제주항공',   role: '객실승무원', employeeId: 'JJ30001', phone: '010-3333-0001' },
  { name: '최은혜', company: '제주항공',   role: '조종사',     employeeId: 'JJ30002', phone: '010-3333-0002' },
  { name: '김민재', company: '티웨이',     role: '객실승무원', employeeId: 'TW40001', phone: '010-4444-0001' },
  { name: '윤서진', company: '티웨이',     role: '지상직',     employeeId: 'TW40002', phone: '010-4444-0002' },
  { name: '조민서', company: '진에어',     role: '객실승무원', employeeId: 'LJ50001', phone: '010-5555-0001' },
  { name: '강유진', company: '진에어',     role: '조종사',     employeeId: 'LJ50002', phone: '010-5555-0002' },
];

const DEFAULT_PASSWORD = 'test1234';

function seed() {
  console.log('[seed] starting...');

  const wipe = db.transaction(() => {
    db.exec('DELETE FROM messages; DELETE FROM ride_participants; DELETE FROM rides; DELETE FROM users;');
  });
  wipe();

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, company, role, employee_id, phone, password_hash, verified, rating, created_at)
    VALUES (@id, @name, @company, @role, @employee_id, @phone, @password_hash, @verified, @rating, @created_at)
  `);

  const insertRide = db.prepare(`
    INSERT INTO rides (id, creator_id, airport, terminal, departure_area, departure_detail,
                       date, time, max_passengers, estimated_fare, note, status, created_at)
    VALUES (@id, @creator_id, @airport, @terminal, @departure_area, @departure_detail,
            @date, @time, @max_passengers, @estimated_fare, @note, @status, @created_at)
  `);

  const insertParticipant = db.prepare(
    'INSERT INTO ride_participants (ride_id, user_id, joined_at) VALUES (?, ?, ?)'
  );

  const userIds = [];

  const run = db.transaction(() => {
    const now = Date.now();

    for (const u of USERS) {
      const id = uuidv4();
      userIds.push(id);
      insertUser.run({
        id,
        name: u.name,
        company: u.company,
        role: u.role,
        employee_id: u.employeeId,
        phone: u.phone,
        password_hash: passwordHash,
        verified: 1,
        rating: 4.7,
        created_at: now,
      });
    }

    const rideSeeds = [
      {
        airport: '인천', terminal: 'T2', area: '강남구', detail: '논현역 6번 출구',
        date: dateStr(0), time: '04:30', max: 3, fare: 85000,
        note: '캐리어 중형 1개. 조용히 가실 분 환영',
        creator: 0, joiners: [1],
      },
      {
        airport: '인천', terminal: 'T1', area: '마포구', detail: '공덕역 2번 출구',
        date: dateStr(0), time: '05:00', max: 4, fare: 90000,
        note: '여성분만 부탁드려요',
        creator: 2, joiners: [],
      },
      {
        airport: '김포', terminal: null, area: '송파구', detail: '잠실역 3번 출구',
        date: dateStr(1), time: '06:15', max: 3, fare: 25000,
        note: '',
        creator: 3, joiners: [4],
      },
      {
        airport: '인천', terminal: 'T2', area: '서초구', detail: '고속터미널역 8-1번 출구',
        date: dateStr(1), time: '04:00', max: 4, fare: 78000,
        note: '국제선 07시 출발 스케줄',
        creator: 5, joiners: [],
      },
      {
        airport: '인천', terminal: 'T1', area: '영등포구', detail: '여의도역 1번 출구',
        date: dateStr(2), time: '03:40', max: 3, fare: 72000,
        note: '',
        creator: 6, joiners: [7],
      },
      {
        airport: '김포', terminal: null, area: '강동구', detail: '천호역 7번 출구',
        date: dateStr(0), time: '20:30', max: 2, fare: 30000,
        note: '국내선 늦은 출근',
        creator: 8, joiners: [],
      },
      {
        airport: '인천', terminal: 'T2', area: '분당구(성남)', detail: '서현역 분당선',
        date: dateStr(2), time: '05:20', max: 4, fare: 95000,
        note: '근처 수서역도 경유 가능',
        creator: 9, joiners: [],
      },
      {
        airport: '인천', terminal: 'T1', area: '용산구', detail: '용산역 1번 출구',
        date: dateStr(2), time: '04:15', max: 3, fare: 75000,
        note: '',
        creator: 0, joiners: [3],
      },
    ];

    for (const r of rideSeeds) {
      const rideId = uuidv4();
      const creatorId = userIds[r.creator];
      const participantIdxs = [r.creator, ...r.joiners];
      const count = participantIdxs.length;
      const status = count >= r.max ? 'full' : 'recruiting';

      insertRide.run({
        id: rideId,
        creator_id: creatorId,
        airport: r.airport,
        terminal: r.terminal,
        departure_area: r.area,
        departure_detail: r.detail,
        date: r.date,
        time: r.time,
        max_passengers: r.max,
        estimated_fare: r.fare,
        note: r.note,
        status,
        created_at: now,
      });

      participantIdxs.forEach((idx, i) => {
        insertParticipant.run(rideId, userIds[idx], now + i);
      });
    }
  });

  run();

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const rideCount = db.prepare('SELECT COUNT(*) AS c FROM rides').get().c;
  console.log(`[seed] done. users=${userCount}, rides=${rideCount}`);
  console.log(`[seed] login with any employeeId above and password: ${DEFAULT_PASSWORD}`);
  console.log('[seed] example -> employeeId=KE10001 password=test1234');
}

function seedIfEmpty() {
  try {
    const row = db.prepare('SELECT COUNT(*) AS c FROM users').get();
    if (row.c === 0) {
      console.log('[seed] empty DB detected, auto-seeding...');
      seed();
    } else {
      console.log(`[seed] DB already populated (users=${row.c}), skipping auto-seed`);
    }
  } catch (err) {
    console.error('[seed] auto-seed check failed:', err);
  }
}

module.exports = { seed, seedIfEmpty };

// Run standalone if invoked directly: `node seed.js`
if (require.main === module) {
  try {
    seed();
    db.close();
  } catch (err) {
    console.error('[seed] failed:', err);
    process.exit(1);
  }
}
