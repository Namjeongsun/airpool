# 에어풀 백엔드 (AirPool Backend)

공항 출근 합승 매칭 서비스 "에어풀"의 REST API 서버입니다. 항공사 승무원·조종사·지상직 등 인천/김포공항으로 출근하는 근무자들이 택시를 함께 탈 수 있도록 매칭해줍니다.

## 개요

- **런타임**: Node.js 18+ / Express 4
- **DB**: SQLite (better-sqlite3, 동기식)
- **인증**: JWT (유효기간 7일) + bcryptjs
- **보안**: helmet, CORS 화이트리스트, express-rate-limit
- **응답 형식**: `{ ok: true, data }` 또는 `{ ok: false, error }`

## 설치

```bash
cd backend
npm install
```

> `better-sqlite3`는 네이티브 모듈이지만 요즘은 Node 18/20/22용 prebuilt 바이너리가 npm에 올라와 있어 대부분의 환경에서 추가 빌드 없이 설치됩니다.
> Windows에서 빌드가 필요해지면 Visual Studio Build Tools(C++ 워크로드)와 Python 3가 필요합니다.

## 환경설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 다음을 설정하세요.

| 키 | 설명 | 기본값 |
|---|---|---|
| `PORT` | 서버 포트 | `3001` |
| `JWT_SECRET` | JWT 서명용 비밀키 (반드시 변경) | `change-this-...` |
| `NODE_ENV` | 환경 (`development` / `production`) | `development` |

`JWT_SECRET`는 반드시 충분히 긴 랜덤 문자열로 교체하세요. 예: `openssl rand -hex 32`.

## 시드 데이터 넣기

```bash
npm run seed
```

10명의 샘플 사용자(대한항공/아시아나/제주항공/티웨이/진에어)와 8개의 합승(인천 T1/T2, 김포, 다음 3일간)이 생성됩니다.

**로그인 테스트용 계정**: `employeeId` 는 `KE10001`, `OZ20001`, `JJ30001` 등, **비밀번호는 모두 `test1234`** 입니다.

## 서버 실행

개발 서버 (nodemon, 파일 변경 시 자동 재시작):

```bash
npm run dev
```

프로덕션 실행:

```bash
npm start
```

서버는 `http://localhost:3001` 에서 대기하며, 최초 실행 시 `data.db` 파일이 자동 생성됩니다.

헬스체크: `GET /health` → `{"ok":true,"data":{"status":"up","time":...}}`

## API 엔드포인트

모든 응답은 JSON이며, 성공 시 `{ ok: true, data }`, 실패 시 `{ ok: false, error: "한국어 에러 메시지" }` 형태로 반환됩니다.

### 인증 (`/auth`)

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/auth/register` | 회원가입 | - |
| POST | `/auth/login` | 로그인 | - |
| GET | `/auth/me` | 현재 사용자 조회 | 필요 |

```bash
# 회원가입
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "company": "대한항공",
    "role": "객실승무원",
    "employeeId": "KE99999",
    "phone": "010-1234-5678",
    "password": "test1234"
  }'

# 로그인
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"KE10001","password":"test1234"}'

# 내 정보
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

> 인증 엔드포인트는 IP당 분당 5회로 제한됩니다.

### 합승 (`/rides`)

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/rides` | 합승 목록 (필터 지원) | - |
| POST | `/rides` | 합승 생성 (개설자 자동 참여) | 필요 |
| GET | `/rides/mine` | 내가 참여 중인 합승 | 필요 |
| GET | `/rides/:id` | 상세 + 참여자 목록 | - |
| POST | `/rides/:id/join` | 합승 참여 | 필요 |
| POST | `/rides/:id/leave` | 합승 탈퇴 (개설자는 불가) | 필요 |
| DELETE | `/rides/:id` | 합승 삭제 (개설자만) | 필요 |

필터 쿼리: `airport=인천|김포`, `area=강남구`, `date=2026-04-22`, `timeBucket=dawn|morning|afternoon|evening`
(시간대: dawn 00-06 / morning 06-12 / afternoon 12-18 / evening 18-24)

```bash
# 인천 T2, 강남 출발, 새벽 시간대
curl "http://localhost:3001/rides?airport=%EC%9D%B8%EC%B2%9C&area=%EA%B0%95%EB%82%A8%EA%B5%AC&timeBucket=dawn"

# 합승 개설
curl -X POST http://localhost:3001/rides \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "airport": "인천",
    "terminal": "T2",
    "departureArea": "강남구",
    "departureDetail": "논현역 6번 출구",
    "date": "2026-04-23",
    "time": "04:30",
    "maxPassengers": 3,
    "estimatedFare": 85000,
    "note": "캐리어 중형 1개"
  }'

# 참여
curl -X POST http://localhost:3001/rides/<RIDE_ID>/join \
  -H "Authorization: Bearer <TOKEN>"
```

### 채팅 (`/rides/:id/messages`)

참여자만 이용할 수 있습니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/rides/:id/messages` | 메시지 목록 (시간 오름차순) |
| POST | `/rides/:id/messages` | 메시지 전송 |

```bash
curl http://localhost:3001/rides/<RIDE_ID>/messages \
  -H "Authorization: Bearer <TOKEN>"

curl -X POST http://localhost:3001/rides/<RIDE_ID>/messages \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"body":"안녕하세요, 어디서 만나면 될까요?"}'
```

## DB 스키마

`better-sqlite3`로 직접 SQL을 실행하며, `data.db` 파일에 저장됩니다. 부팅 시 `db.js`가 테이블이 없으면 자동으로 생성합니다.

### users
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | 이름 |
| company | TEXT | 회사 (대한항공/아시아나/...) |
| role | TEXT | 직군 (객실승무원/조종사/지상직) |
| employee_id | TEXT UNIQUE | 사번 (로그인 아이디) |
| phone | TEXT | 연락처 |
| password_hash | TEXT | bcrypt 해시 |
| verified | INTEGER | 인증 여부 (0/1) |
| rating | REAL | 평점 (기본 5.0) |
| created_at | INTEGER | 생성 시각 (ms epoch) |

### rides
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | UUID |
| creator_id | TEXT FK → users | 개설자 |
| airport | TEXT | `인천` / `김포` |
| terminal | TEXT NULL | `T1` / `T2` / null(김포) |
| departure_area | TEXT | 출발 지역 (구/시) |
| departure_detail | TEXT | 상세 주소 |
| date | TEXT | `YYYY-MM-DD` |
| time | TEXT | `HH:MM` (24h) |
| max_passengers | INTEGER | 2~4 |
| estimated_fare | INTEGER | 예상 요금 (원) |
| note | TEXT | 메모 |
| status | TEXT | `recruiting` / `full` / `cancelled` / `completed` |
| created_at | INTEGER | |

### ride_participants
| 컬럼 | 타입 |
|---|---|
| ride_id | TEXT FK → rides |
| user_id | TEXT FK → users |
| joined_at | INTEGER |
| PK | (ride_id, user_id) |

### messages
| 컬럼 | 타입 |
|---|---|
| id | TEXT PK |
| ride_id | TEXT FK → rides |
| user_id | TEXT FK → users |
| body | TEXT |
| created_at | INTEGER |

## 프론트엔드 연동 방법

현재 프론트엔드(`airport-carpool/app.js`)는 `localStorage`만 사용합니다. 실제 서버에 붙이려면 아래와 같이 바꾸면 됩니다.

### 1. API 베이스 URL과 토큰 저장소 추가

`app.js` 상단에 추가:

```js
const API_BASE = 'http://localhost:3001';

function getToken()     { return localStorage.getItem('airpool_token'); }
function setToken(t)    { localStorage.setItem('airpool_token', t); }
function clearToken()   { localStorage.removeItem('airpool_token'); }

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: '응답 파싱 실패' }));
  if (!json.ok) throw new Error(json.error || '요청 실패');
  return json.data;
}
```

### 2. 기존 localStorage 호출을 교체

```js
// 기존: loadState()에서 localStorage.getItem(STORAGE.rides) 읽기
// 변경:
const { rides } = await api('/rides');
state.rides = rides;
```

```js
// 기존: 회원가입/로그인 시 localStorage.setItem(STORAGE.user, ...)
// 변경:
const { token, user } = await api('/auth/register', { method: 'POST', body: form });
setToken(token);
state.user = user;
```

```js
// 기존: state.rides.push(new); saveRides();
// 변경:
const { ride } = await api('/rides', { method: 'POST', body: rideForm, auth: true });
state.rides.push(ride);
```

```js
// 참여 / 탈퇴 / 삭제
await api(`/rides/${rideId}/join`,   { method: 'POST',   auth: true });
await api(`/rides/${rideId}/leave`,  { method: 'POST',   auth: true });
await api(`/rides/${rideId}`,        { method: 'DELETE', auth: true });
```

```js
// 채팅
const { messages } = await api(`/rides/${rideId}/messages`, { auth: true });
await api(`/rides/${rideId}/messages`, { method: 'POST', body: { body: text }, auth: true });
```

### 3. 시드 비활성화

백엔드가 자체 시드를 관리하므로 프론트의 `seedIfNeeded()` 호출은 제거하거나 비워두면 됩니다.

### 4. CORS

서버는 `http://localhost:*`, `http://127.0.0.1:*`, 그리고 `file://` 로 열린 페이지를 허용합니다. 프론트를 다른 도메인에 배포할 땐 `server.js` 의 CORS 화이트리스트를 업데이트하세요.

## 트러블슈팅

- **설치 실패 (better-sqlite3)**: Windows에서 prebuilt가 없을 경우 `npm config set msvs_version 2022` 후 재설치, 또는 Python 3 설치를 확인하세요.
- **포트 충돌**: `.env` 의 `PORT` 를 변경.
- **DB 초기화**: `data.db` 파일을 지우고 `npm run seed` 를 다시 실행하세요.
- **Rate limit 에러 (429)**: 짧은 시간에 너무 많이 요청했다는 뜻입니다. 잠시 후 재시도하거나, 개발 중이라면 `server.js` 의 `max` 값을 올리세요.

## 프로젝트 구조

```
backend/
├─ server.js            Express 엔트리
├─ db.js                better-sqlite3 초기화 + 스키마
├─ seed.js              샘플 데이터
├─ routes/
│  ├─ auth.js           /auth/*
│  ├─ rides.js          /rides/*
│  └─ messages.js       /rides/:id/messages
├─ middleware/
│  ├─ auth.js           JWT 검증
│  └─ validate.js       입력값 검증
├─ package.json
├─ .env.example
└─ data.db              (런타임 생성)
```
