# 에어풀(AirPool) 배포 가이드

> **문서 버전**: v1.0 · 2026-04-22
> **대상**: 1인 개발자 ~ 소규모 팀 초기 배포 실무 가이드

---

## 1. MVP 배포 — 무료 / 저비용 구성

에어풀 MVP는 **월 $10~15 수준**에서 충분히 운영 가능합니다.

### 1.1 구성요소별 공급자

| 구성요소 | 공급자 | 무료 한도 | 유료 플랜 |
|---|---|---|---|
| **Frontend (PWA)** | Vercel Hobby | 100GB 대역폭/월 | Pro $20/월 |
| **Frontend (대안)** | Netlify Free | 100GB 대역폭/월 | Pro $19/월 |
| **Backend** | Railway Hobby | $5 크레딧 | Pro $20/월 |
| **Backend (대안)** | Render Free | 무료 (sleep 있음) | Starter $7/월 |
| **Backend (대안 2)** | Fly.io Hobby | 3 VM 무료 | 사용량 기반 |
| **DB** | Railway Postgres | $5/월 (1GB) | 사용량 기반 |
| **DB (대안)** | Supabase Free | 500MB, 50k MAU | Pro $25/월 |
| **DB (대안 2)** | Neon Serverless Free | 3GB 스토리지 | $19/월+ |
| **이미지 스토리지** | Cloudflare R2 | 10GB 저장 무료 | $0.015/GB |
| **도메인** | 가비아 `.kr` | - | 연 약 22,000원 |
| **도메인 (대안)** | Cloudflare Registrars | - | 원가 판매 (`.com` ≈ $10) |

### 1.2 권장 조합 (Early MVP)

```
Frontend:  Vercel Hobby        (무료)
Backend:   Railway Hobby       ($5)
DB:        SQLite(파일) → Railway Postgres 전환  ($5)
이미지:    Cloudflare R2       (무료 한도)
도메인:    가비아 airpool.kr   (연 22,000원)
모니터링:  Sentry Dev + UptimeRobot  (무료)
───────────────────────────────────
합계:      약 $10~13 / 월
```

---

## 2. 단계별 배포 절차

### 2.1 GitHub 저장소 준비

```bash
cd airport-carpool
git init
git add .
git commit -m "initial commit: AirPool MVP"
git remote add origin git@github.com:<org>/airport-carpool.git
git push -u origin main
```

**권장 브랜치 전략**:
- `main` — production 자동 배포
- `develop` — staging 자동 배포
- `feat/*`, `fix/*` — PR 기반 작업

### 2.2 Vercel 프론트엔드 연동

1. [vercel.com](https://vercel.com) 로그인 → **New Project** → GitHub 저장소 선택
2. 루트 디렉토리: `airport-carpool/` (index.html이 있는 곳)
3. **Framework Preset**: Other (정적 PWA)
4. **Build Command**: 없음 (또는 `echo "static"`)
5. **Output Directory**: `.`
6. **Environment Variables**:
   ```
   VITE_API_URL=https://api.airpool.kr
   VITE_SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
   ```
7. Deploy 클릭 → 5분 내 `airport-carpool.vercel.app` 생성

### 2.3 Railway 백엔드 배포

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. `backend/` 디렉토리 선택
3. **Start Command**: `node server.js`
4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=${{RAILWAY_TCP_PROXY_PORT}}
   JWT_PRIVATE_KEY=<RSA private key>
   JWT_PUBLIC_KEY=<RSA public key>
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   R2_ACCESS_KEY=xxx
   R2_SECRET_KEY=xxx
   R2_BUCKET=airpool-verify
   TOSS_CLIENT_KEY=xxx
   TOSS_SECRET_KEY=xxx
   CORS_ORIGIN=https://airpool.kr
   ```
5. **Add Plugin → PostgreSQL** → 자동으로 `DATABASE_URL` 주입
6. **Settings → Networking → Generate Domain**: `api.airpool.up.railway.app`

### 2.4 커스텀 도메인 + SSL

1. 가비아에서 `airpool.kr` 구매
2. DNS 설정:
   ```
   A      @        76.76.21.21              (Vercel)
   CNAME  www      cname.vercel-dns.com     (Vercel)
   CNAME  api      api.airpool.up.railway.app  (Railway)
   ```
3. Vercel Dashboard → Domains → `airpool.kr` 추가 → 자동 SSL (Let's Encrypt)
4. Railway Dashboard → Settings → Custom Domain → `api.airpool.kr` 추가

---

## 3. 환경별 설정

### 3.1 환경 분리

| 환경 | 도메인 | DB | 용도 |
|---|---|---|---|
| **development** | `localhost:3000` | SQLite 로컬 파일 | 개발자 로컬 |
| **staging** | `staging.airpool.kr` | Railway Postgres (staging) | 배포 전 QA |
| **production** | `airpool.kr` | Railway Postgres (prod) | 실사용자 |

### 3.2 `.env` 파일 관리

**프로젝트 루트에 두지 않을 것**:
- `.env` → `.gitignore`
- `.env.example` → 커밋 (키 값은 빈 값으로)

**예시** `.env.example`:
```env
NODE_ENV=development
PORT=3000
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
DATABASE_URL=sqlite://./data.db
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
CORS_ORIGIN=http://localhost:5173
```

**비밀키 관리**:
- 로컬: `.env` 파일
- 배포: Vercel/Railway Environment Variables UI
- 팀 공유: 1Password·Doppler·Infisical 권장
- **GitHub에 커밋 금지** (push 시 자동 검사: `git-secrets` 도구)

---

## 4. CI/CD 예시 (GitHub Actions)

### 4.1 기본 워크플로우

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend deps
        working-directory: backend
        run: npm ci

      - name: Lint
        working-directory: backend
        run: npm run lint

      - name: Test
        working-directory: backend
        run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: sqlite::memory:

      - name: Frontend syntax check
        run: |
          npx html-validate airport-carpool/index.html

  deploy-staging:
    needs: lint-test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway (staging)
        run: |
          npm i -g @railway/cli
          railway up --service backend-staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-production:
    needs: lint-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway (production)
        run: |
          npm i -g @railway/cli
          railway up --service backend-prod
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 4.2 Vercel 자동 배포

Vercel은 GitHub 연동 시 별도 YAML 없이도 `main` push 시 자동 production deploy, PR 시 preview deploy 생성.

### 4.3 DB 마이그레이션

Prisma 예시:
```yaml
- name: Run DB migration
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
```

---

## 5. 모니터링

### 5.1 에러 트래킹 — Sentry

백엔드:
```js
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
app.use(Sentry.Handlers.requestHandler());
// ... routes
app.use(Sentry.Handlers.errorHandler());
```

프론트엔드(PWA):
```html
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
    tracesSampleRate: 0.1,
  });
</script>
```

### 5.2 사용자 분석

| 도구 | 특징 | 추천 상황 |
|---|---|---|
| **Plausible** | 쿠키리스, 경량, 개인정보 친화 | MVP ~ Early Growth |
| **GA4** | 무료, 방대한 기능, 쿠키 동의 필요 | 본격 성장기 |
| **Mixpanel** | 이벤트·퍼널 분석 강력 | Retention 분석 시 |
| **Amplitude** | 코호트·리텐션 상세 | Series A 이후 |

**MVP 권장**: Plausible + Mixpanel(이벤트) 조합.

### 5.3 서비스 상태 모니터링 — UptimeRobot

- [uptimerobot.com](https://uptimerobot.com) 무료 50개 모니터
- 체크: `https://api.airpool.kr/healthz` 5분 간격
- 장애 시 Slack/이메일 알림

헬스체크 엔드포인트:
```js
app.get('/healthz', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', timestamp: Date.now() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: e.message });
  }
});
```

### 5.4 로그 관리

| 단계 | 도구 |
|---|---|
| MVP | Railway/Vercel 내장 로그 |
| Growth | Logtail (Better Stack) 또는 Axiom |
| Scale | Datadog 또는 ELK |

---

## 6. 스케일업 시나리오

### 6.1 MAU 1만 전후 — 인프라 재검토 시점

| 증상 | 조치 |
|---|---|
| 매칭 쿼리 지연 | Postgres 인덱스 점검, Redis 캐시 도입 |
| 이미지 업로드 병목 | R2 Direct Upload (Presigned URL 클라이언트 직결) |
| API Rate Limit 부족 | Cloudflare WAF + Rate Limiting Rules |
| Railway 단일 노드 한계 | Railway Pro 전환 또는 **AWS ECS/GCP Cloud Run 이관 검토** |

### 6.2 MAU 5만~10만 — AWS/GCP 이관

**이관 대상**:
- Backend: ECS Fargate 또는 GKE
- DB: RDS Postgres (Multi-AZ) 또는 Cloud SQL
- Redis: ElastiCache 또는 Memorystore
- 이미지: S3 + CloudFront (또는 R2 유지)

**예상 월 비용**: $300~500 (MAU 10만 기준, 여유 용량 포함)

### 6.3 DB 최적화

- **Read Replica** 추가 → 매칭 검색 트래픽 분산
- **파티셔닝**: `rides` 테이블 월별 파티션 (조회는 최근 30일 대부분)
- **VACUUM·ANALYZE 자동화**: `pg_cron`
- **Slow Query 로그** 상시 감시

### 6.4 컨테이너화 (Docker)

`backend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

`docker-compose.yml` (로컬 개발):
```yaml
version: '3.9'
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://postgres:pass@db:5432/airpool
    depends_on: [db, redis]
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: airpool
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
volumes:
  pgdata:
```

### 6.5 Kubernetes (MAU 100만+)

- 실제 필요 시점: 국내 MAU 50만 이상 또는 해외 확장 시
- 프리시점 도입은 운영 복잡도 대비 효용 낮음
- **GKE Autopilot** 또는 **EKS + Karpenter** 권장

---

## 부록. 배포 체크리스트 (출시 D-7)

- [ ] `main` 브랜치 보호 규칙 (PR 필수, 리뷰 1인 이상)
- [ ] Secrets 모두 Vercel/Railway에 설정 완료
- [ ] 도메인 SSL 정상 작동 (`https://airpool.kr` 접속 확인)
- [ ] `/healthz` 엔드포인트 UptimeRobot 연결
- [ ] Sentry 에러 트래킹 테스트 (의도적 에러 발생 후 대시보드 확인)
- [ ] DB 백업 스케줄 (Railway Daily Backup) 활성화
- [ ] 개인정보처리방침·이용약관 링크 앱 내 정상 노출
- [ ] iOS/Android 주요 브라우저 (Chrome, Safari) PWA 설치 테스트
- [ ] 실사용자 5명 이상 파일럿 완료
- [ ] CS 이메일(`support@airpool.kr`) 응답 체계
- [ ] 장애 대응 플레이북 (Slack #incident 채널)

---

**문서 최종 수정**: 2026-04-22
