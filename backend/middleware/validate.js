'use strict';

// Lightweight validation helpers. Returns an array of Korean error strings (empty if valid).

function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

function isPhone(v) {
  return typeof v === 'string' && /^[0-9+\-()\s]{8,20}$/.test(v);
}

function isDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isTime(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function isInt(v, { min = -Infinity, max = Infinity } = {}) {
  return Number.isInteger(v) && v >= min && v <= max;
}

function validateRegister(body) {
  const errors = [];
  if (!isNonEmptyString(body.name, 40)) errors.push('이름을 입력해주세요');
  if (!isNonEmptyString(body.company, 40)) errors.push('회사명을 입력해주세요');
  if (!isNonEmptyString(body.role, 40)) errors.push('직군을 입력해주세요');
  if (!isNonEmptyString(body.employeeId, 40)) errors.push('사번을 입력해주세요');
  if (!isPhone(body.phone)) errors.push('연락처 형식이 올바르지 않습니다');
  if (!isNonEmptyString(body.password, 200) || body.password.length < 6) {
    errors.push('비밀번호는 6자 이상이어야 합니다');
  }
  return errors;
}

function validateLogin(body) {
  const errors = [];
  if (!isNonEmptyString(body.employeeId)) errors.push('사번을 입력해주세요');
  if (!isNonEmptyString(body.password)) errors.push('비밀번호를 입력해주세요');
  return errors;
}

function validateRide(body) {
  const errors = [];
  if (!['인천', '김포'].includes(body.airport)) errors.push('공항을 선택해주세요 (인천/김포)');
  if (body.terminal != null && !isNonEmptyString(body.terminal, 20)) {
    errors.push('터미널 형식이 올바르지 않습니다');
  }
  if (!isNonEmptyString(body.departureArea, 40)) errors.push('출발 지역을 입력해주세요');
  if (!isNonEmptyString(body.departureDetail, 200)) errors.push('출발 상세 위치를 입력해주세요');
  if (!isDate(body.date)) errors.push('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)');
  if (!isTime(body.time)) errors.push('시간 형식이 올바르지 않습니다 (HH:MM)');
  if (!isInt(body.maxPassengers, { min: 2, max: 4 })) {
    errors.push('최대 탑승 인원은 2~4명 사이여야 합니다');
  }
  if (!isInt(body.estimatedFare, { min: 0, max: 1_000_000 })) {
    errors.push('예상 요금이 올바르지 않습니다');
  }
  if (body.note != null && typeof body.note !== 'string') errors.push('메모 형식이 올바르지 않습니다');
  return errors;
}

function validateMessage(body) {
  const errors = [];
  if (!isNonEmptyString(body.body, 1000)) errors.push('메시지 내용을 입력해주세요');
  return errors;
}

// Maps a timeBucket label to [startInclusive, endExclusive] 24h HH:MM strings.
function timeBucketRange(bucket) {
  switch (bucket) {
    case 'dawn':      return ['00:00', '06:00'];
    case 'morning':   return ['06:00', '12:00'];
    case 'afternoon': return ['12:00', '18:00'];
    case 'evening':   return ['18:00', '24:00'];
    default:          return null;
  }
}

module.exports = {
  validateRegister,
  validateLogin,
  validateRide,
  validateMessage,
  timeBucketRange,
};
