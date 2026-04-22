# 🚀 에어풀 배포 가이드 (완전 초보자용)

목표: 내 컴퓨터가 꺼져 있어도 접속되는 **영구 링크** 만들기

```
프론트엔드 → Vercel  (https://airpool-xxx.vercel.app)
백엔드    → Render  (https://airpool-backend-xxx.onrender.com)
코드 보관 → GitHub  (https://github.com/내아이디/airpool)
```

---

## 📋 체크리스트

- [ ] **Step 1**: GitHub 리포지토리 생성
- [ ] **Step 2**: 코드를 GitHub에 업로드
- [ ] **Step 3**: Render에 백엔드 배포
- [ ] **Step 4**: Vercel에 프론트엔드 배포
- [ ] **Step 5**: 프론트엔드와 백엔드 주소 연결
- [ ] **Step 6**: 최종 테스트 + 친구한테 자랑

---

## Step 1: GitHub 리포지토리 만들기 (5분)

1. [github.com](https://github.com) 로그인
2. 우측 상단 **`+`** 버튼 → **"New repository"** 클릭
3. 설정:
   - Repository name: `airpool` (또는 원하는 이름)
   - Description: `공항 출근자를 위한 택시 합승 매칭 서비스`
   - **Public** 선택 (Private도 가능하지만 Public이 나중에 편함)
   - ⚠️ **"Add a README file" 체크 해제** (이미 우리가 만들었음)
   - ⚠️ "Add .gitignore" = **None** (이미 만들었음)
3. **Create repository** 클릭
4. 생성된 페이지의 **URL 복사**
   - 예: `https://github.com/jsnam/airpool.git`

---

## Step 2: 코드를 GitHub에 올리기 (10분)

### 터미널 열기

1. 파일 탐색기에서 **`airport-carpool`** 폴더로 이동 (backend 폴더 말고 상위)
2. 주소창 클릭 → `cmd` 입력 → Enter

### 명령어 실행 (순서대로 한 줄씩)

```bash
git init
```
→ Git 시작

```bash
git add .
```
→ 모든 파일 추가

```bash
git commit -m "initial commit"
```
→ 첫 커밋

```bash
git branch -M main
```
→ main 브랜치 설정

```bash
git remote add origin https://github.com/YOUR_USERNAME/airpool.git
```
→ ⚠️ `YOUR_USERNAME`을 **본인 GitHub 아이디로** 변경

```bash
git push -u origin main
```
→ 업로드 시작

로그인 창 뜨면 GitHub 계정으로 인증 (처음만)

**새로고침** 하면 GitHub에 파일들이 다 올라가 있을 거예요.

---

## Step 3: Render에 백엔드 배포 (15분)

### 3-1. Render 가입

1. [render.com](https://render.com) 접속
2. **Get Started for Free** 클릭
3. **GitHub으로 로그인** (Sign in with GitHub)
4. 권한 승인

### 3-2. 백엔드 서비스 생성

1. 대시보드에서 **New +** → **Web Service** 클릭
2. **"Connect a repository"** 섹션에서 방금 올린 `airpool` 리포지토리 선택
3. 설정 화면에서 아래대로 입력:

| 항목 | 값 |
|------|-----|
| **Name** | `airpool-backend` (원하는 이름) |
| **Region** | Singapore (한국에서 가장 가까움) |
| **Branch** | `main` |
| **Root Directory** | `backend` ⚠️ 꼭 입력 |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** ✅ |

4. **Advanced** 펼치기 → **Add Environment Variable**:
   - Key: `NODE_ENV`, Value: `production`
   - Key: `JWT_SECRET`, Value: 아무 긴 랜덤 문자열 (예: `airpool-super-secret-key-2026-change-me`)

5. **Create Web Service** 클릭

### 3-3. 배포 기다리기 (5~10분)

로그 화면이 뜨고 빌드가 진행됩니다. 아래 메시지가 보이면 성공:
```
[seed] auto-seeding...
[airpool] listening on port 10000
Your service is live 🎉
```

### 3-4. 백엔드 URL 확인

페이지 상단에 주소가 보입니다:
```
https://airpool-backend-xxxx.onrender.com
```

이 주소를 **복사해서 메모장에 저장**해두세요. 나중에 씁니다.

### 3-5. 백엔드 테스트

브라우저에서:
```
https://airpool-backend-xxxx.onrender.com/health
```
→ `{"ok":true,"data":{"status":"up",...}}` 뜨면 성공 ✅

⚠️ **첫 접속은 30초~1분 걸립니다** (무료 플랜 특성. 15분 안 쓰면 잠듦)

---

## Step 4: Vercel에 프론트엔드 배포 (5분)

### 4-1. Vercel 가입

1. [vercel.com](https://vercel.com) 접속
2. **Sign Up** → **Continue with GitHub**
3. 권한 승인

### 4-2. 프로젝트 추가

1. 대시보드 → **Add New...** → **Project** 클릭
2. `airpool` 리포지토리 **Import** 클릭
3. 설정은 **전부 기본값**으로 두기:
   - Framework Preset: **Other**
   - Root Directory: `./` (루트)
   - Build Command: (비움)
   - Output Directory: (비움)
4. **Deploy** 클릭

### 4-3. 배포 완료 (1분)

축하 화면이 뜨면서 URL이 나옵니다:
```
https://airpool-xxx.vercel.app
```

⚠️ **이게 친구한테 자랑할 진짜 URL입니다!** 메모장에 복사하세요.

---

## Step 5: 프론트엔드와 백엔드 연결 (5분)

지금은 프론트엔드가 `CHANGE_ME.onrender.com`을 보고 있어서 연결이 안 됩니다. 실제 백엔드 주소로 바꿔야 해요.

### 5-1. app.js 수정

1. 내 컴퓨터의 `airport-carpool\app.js` 파일 열기
2. 맨 위쪽 `CHANGE_ME.onrender.com` 찾아서 → 실제 백엔드 주소로 변경
   - 예시 (변경 전):
     ```js
     return window.AIRPOOL_API_BASE || 'https://CHANGE_ME.onrender.com';
     ```
   - 예시 (변경 후):
     ```js
     return window.AIRPOOL_API_BASE || 'https://airpool-backend-xxxx.onrender.com';
     ```

### 5-2. 변경사항 GitHub에 올리기

backend 폴더가 아닌 **airport-carpool 폴더**에서 cmd 열고:

```bash
git add app.js
git commit -m "connect frontend to backend"
git push
```

Vercel이 자동으로 감지해서 1~2분 내에 재배포합니다.

### 5-3. CORS 업데이트 (Render)

1. Render 대시보드 → `airpool-backend` 서비스 클릭
2. **Environment** 탭
3. **Add Environment Variable** → 추가:
   - Key: `ALLOWED_ORIGINS`
   - Value: Vercel 주소 (예: `https://airpool-xxx.vercel.app`)
4. **Save Changes** → 자동 재시작

(사실 이미 `*.vercel.app`를 허용하게 코드에 넣어놨지만, 명시적으로 하는 게 안전)

---

## Step 6: 최종 테스트

### 6-1. Vercel URL 접속

```
https://airpool-xxx.vercel.app
```

- 허브 페이지가 뜸 → **메인 앱** 클릭
- 로그인: `KE10001` / `test1234`
- 합승 목록 보이면 🎉 **성공!**

### 6-2. 친구한테 자랑

카톡으로:
> "내가 만든 앱이야ㅋㅋ 한번 써봐
> https://airpool-xxx.vercel.app
> 사번 `KE10001`, 비번 `test1234` 로 로그인해봐"

---

## 🎁 이후 코드 수정하고 싶을 때

1. 파일 수정
2. `airport-carpool` 폴더에서 cmd:
   ```bash
   git add .
   git commit -m "디자인 변경"
   git push
   ```
3. **Vercel(프론트)과 Render(백엔드)가 자동 감지해서 배포** (1~2분)
4. 같은 URL에서 업데이트된 모습 확인

---

## ⚠️ 알아둘 점

### 무료 플랜의 제약

| 플랫폼 | 제약 |
|--------|------|
| **Vercel** | 거의 제약 없음. 개인 프로젝트는 평생 무료 |
| **Render (Free)** | 15분 동안 요청 없으면 서버 잠듦. 다시 깨우는데 30초~1분 소요. 첫 방문자는 기다려야 함 |
| **SQLite on Render** | 재시작 시 데이터 사라짐 (자동 시드로 복구) |

### 실서비스로 발전시킬 때

- **Render 유료**: $7/월 → 24/7 동작 + 영구 디스크
- **PostgreSQL**: Render 무료 DB로 업그레이드 ($0, 90일 한정)
- **커스텀 도메인**: `airpool.kr` 같은 주소 ($15/년)

---

## 🚨 막혔을 때

### GitHub push 할 때 "permission denied"
→ Personal Access Token 필요. [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token → `repo` 권한 체크 → 토큰을 비밀번호 대신 입력

### Render 빌드 실패
→ 로그에서 에러 메시지 확인. 대부분 `Root Directory: backend` 설정 빼먹음

### Vercel 배포 후 로그인 안 됨
→ app.js의 `CHANGE_ME` 안 바꿨거나, 백엔드 URL 뒤에 `/` 붙어있음

### CORS 에러
→ Render 환경변수에 `ALLOWED_ORIGINS` 추가 + Vercel 주소 정확히 입력

---

막히면 스크린샷 찍어서 저한테 보여주세요. 바로 알려드릴게요.
