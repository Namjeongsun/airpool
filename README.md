# 에어풀 (AirPool)

**공항 근무자 전용 택시 합승 매칭 서비스**

인천국제공항·김포국제공항으로 출퇴근하는 승무원·조종사·지상직·공항 상주 근무자를 위한 **재직 인증 기반 택시 합승 플랫폼**입니다. 새벽 4~5시 브리핑을 위해 편도 7~9만원의 택시비를 혼자 부담하던 동료들이, 같은 시간 같은 지역에서 같은 공항으로 향하는 동료와 매칭되어 택시비를 분담할 수 있도록 돕습니다.

2022년 개정된 「여객자동차운수사업법」에 따라 플랫폼을 통한 택시 합승이 합법화되었으며, 에어풀은 **재직 인증**을 통해 일반 합승 서비스와 차별화된 안전성·신뢰도를 제공합니다.

---

## 폴더 구조

```
airport-carpool/
├── index.html          메인 PWA 앱
├── app.js              프론트엔드 로직
├── styles.css          스타일시트
├── backend/            Node.js + Express API 서버
├── admin/              재직 인증·신고 처리 어드민 대시보드
├── landing/            마케팅 랜딩 페이지
└── docs/               사업·기술 문서
    ├── business-plan.md
    ├── tech-architecture.md
    ├── legal-compliance.md
    └── deployment-guide.md
```

---

## 빠른 시작

### 메인 앱 (PWA)

```bash
# 정적 파일이므로 별도 빌드 없이 실행
npx serve .
# 또는
python -m http.server 5173
```

브라우저에서 `http://localhost:5173` 접속 후 모바일 뷰로 확인.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# .env 파일 편집 (DATABASE_URL, JWT 키 등)
npm run dev
```

기본 포트: `http://localhost:3000`

### Admin 대시보드

```bash
cd admin
npx serve .
```

기본 포트: `http://localhost:5174`

### Landing 페이지

```bash
cd landing
npx serve .
```

기본 포트: `http://localhost:5175`

---

## 스크린샷

> (스크린샷은 출시 전 업데이트 예정)
>
> - `docs/screenshots/home.png` — 홈 화면
> - `docs/screenshots/match.png` — 매칭 화면
> - `docs/screenshots/chat.png` — 채팅 화면
> - `docs/screenshots/verify.png` — 재직 인증 화면

---

## 문서

| 문서 | 내용 |
|---|---|
| [사업 기획서](./docs/business-plan.md) | 시장 분석, 비즈니스 모델, 로드맵, 재무 계획 |
| [기술 아키텍처](./docs/tech-architecture.md) | 시스템 구조, DB 스키마, 매칭 알고리즘, 보안 |
| [법적 검토](./docs/legal-compliance.md) | 여객운수법·개인정보법 대응, 약관 체크리스트 |
| [배포 가이드](./docs/deployment-guide.md) | Vercel/Railway 배포, CI/CD, 모니터링, 스케일업 |

---

## 기술 스택 요약

- **Frontend**: Vanilla JS + PWA (향후 React Native 전환 예정)
- **Backend**: Node.js + Express
- **Database**: SQLite (MVP) → PostgreSQL + PostGIS (Production)
- **실시간**: SSE (MVP) → WebSocket (Phase 2)
- **배포**: Vercel + Railway + Cloudflare R2

---

## 기여 방법

1. Issue를 먼저 열어 의논해 주세요.
2. 이 저장소를 Fork 하세요.
3. 기능 브랜치 생성: `git checkout -b feat/your-feature`
4. 커밋 컨벤션: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
5. Pull Request 생성 (본문에 변경 사항·테스트 방법 기재)

코드 스타일: ESLint + Prettier 설정 준수.

---

## 라이선스

[MIT License](./LICENSE)

---

## 문의

- 기획·제휴: team@airpool.kr (예정)
- 기술 이슈: GitHub Issues
- 법무·개인정보: privacy@airpool.kr (예정)
