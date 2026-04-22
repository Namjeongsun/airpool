/* ==========================================================
   에어풀 - 공항 출근 합승 매칭
   백엔드 연동 버전 (fetch API)
   - API: http://localhost:3001
   - JWT 인증 (localStorage에 토큰 저장)
   ========================================================== */

// API 주소 자동 감지: 로컬 개발 vs 배포 환경
const API_BASE = (() => {
    const host = window.location.hostname;
    const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:';
    if (isLocal) return 'http://localhost:3001';
    // 배포 후 아래 URL을 Render 백엔드 주소로 교체하세요
    return window.AIRPOOL_API_BASE || 'https://airpool-backend.onrender.com';
})();

const AREAS = [
    '강남구', '서초구', '송파구', '강동구',
    '마포구', '서대문구', '은평구', '종로구', '중구', '용산구',
    '영등포구', '구로구', '금천구', '관악구', '동작구',
    '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구', '노원구', '도봉구',
    '양천구', '강서구',
    '분당구(성남)', '일산동구', '일산서구', '부천시', '인천 부평구', '인천 계양구', '인천 서구', '인천 남동구',
    '기타'
];

const STORAGE = {
    token: 'airpool_token',
};

const state = {
    user: null,
    rides: [],
    myRides: [],
    currentScreen: 'home',
    navHistory: [],
    detailRide: null,
    myRidesTab: 'upcoming',
    authMode: 'login',
};

// ==================== 유틸 ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmtKRW = (n) => n.toLocaleString('ko-KR') + '원';
const pad = (n) => String(n).padStart(2, '0');

function fmtDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const target = new Date(d); target.setHours(0,0,0,0);
    if (+target === +today) return '오늘';
    if (+target === +tomorrow) return '내일';
    const days = ['일','월','화','수','목','금','토'];
    return `${d.getMonth()+1}/${d.getDate()} (${days[d.getDay()]})`;
}

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function confirmModal(title, body) {
    return new Promise(resolve => {
        $('#modal-title').textContent = title;
        $('#modal-body').textContent = body;
        $('#modal').classList.remove('hidden');
        const ok = $('#modal-ok'); const cancel = $('#modal-cancel');
        const close = (val) => {
            $('#modal').classList.add('hidden');
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
            resolve(val);
        };
        const onOk = () => close(true);
        const onCancel = () => close(false);
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
    });
}

// ==================== API 클라이언트 ====================
function getToken() { return localStorage.getItem(STORAGE.token); }
function setToken(token) { localStorage.setItem(STORAGE.token, token); }
function clearToken() { localStorage.removeItem(STORAGE.token); }

async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    let res;
    try {
        res = await fetch(API_BASE + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (err) {
        showBackendBanner();
        throw new Error('서버에 연결할 수 없습니다. 백엔드를 실행해주세요');
    }

    let json;
    try { json = await res.json(); } catch { json = null; }

    if (!res.ok || !json || json.ok === false) {
        const msg = (json && json.error) || `요청 실패 (${res.status})`;
        throw new Error(msg);
    }
    return json.data;
}

function showBackendBanner() {
    if ($('#backend-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'backend-banner';
    banner.className = 'backend-banner';
    banner.innerHTML = '⚠️ 백엔드 서버에 연결할 수 없습니다. 터미널에서 <code>cd backend && npm start</code> 실행 후 새로고침';
    document.body.appendChild(banner);
}
function hideBackendBanner() {
    const b = $('#backend-banner');
    if (b) b.remove();
}

// ==================== 데이터 로더 ====================
async function fetchAllRides(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString() ? '?' + params.toString() : '';
    const data = await api('/rides' + qs);
    state.rides = data.rides;
    return data.rides;
}

async function fetchMyRides() {
    const data = await api('/rides/mine', { auth: true });
    state.myRides = data.rides;
    return data.rides;
}

// ==================== 헬퍼 ====================
function isParticipant(r, userId) { return r.participants.some(p => p.id === userId); }
function isFull(r) { return r.participants.length >= r.maxPassengers; }
function isPast(r) {
    const dt = new Date(`${r.date}T${r.time}`);
    return dt.getTime() < Date.now();
}
function byDateTimeAsc(a, b) {
    return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
}
function byDateTimeDesc(a, b) {
    return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
}

// ==================== 렌더링: 라이드 카드 ====================
function renderRideList(selector, rides, opts = {}) {
    const container = $(selector);
    container.innerHTML = '';
    if (!rides.length) {
        const e = opts.empty || { emoji: '😶', msg: '표시할 항목 없음' };
        container.innerHTML = `<div class="empty-state"><span class="emoji">${e.emoji}</span><p>${e.msg.replace(/\n/g, '<br>')}</p></div>`;
        return;
    }
    rides.forEach(r => container.appendChild(rideCard(r)));
}

function rideCard(r) {
    const card = document.createElement('div');
    const mine = isParticipant(r, state.user.id);
    const full = isFull(r);
    card.className = 'ride-card' + (mine ? ' mine' : '') + (full ? ' full' : '');
    card.addEventListener('click', () => openDetail(r.id));

    const airportClass = r.airport === '김포' ? 'gimpo' : '';
    const airportLabel = r.airport + (r.terminal ? ' ' + r.terminal : '');
    const farePerPerson = Math.ceil(r.estimatedFare / r.maxPassengers);

    const avatarsHTML = Array.from({ length: r.maxPassengers }).map((_, i) => {
        const p = r.participants[i];
        if (p) return `<div class="avatar" title="${p.name}">${p.name.slice(-1)}</div>`;
        return `<div class="avatar empty">+</div>`;
    }).join('');

    card.innerHTML = `
        <div class="rc-top">
            <div class="rc-route">
                <span>${r.departureArea}</span>
                <span class="rc-arrow">→</span>
                <span>${airportLabel}</span>
            </div>
            <span class="rc-airport-chip ${airportClass}">${r.airport}</span>
        </div>
        <div class="rc-meta">
            <span>📅 ${fmtDate(r.date)}</span>
            <span>🕐 ${r.time}</span>
            <span>📍 ${r.departureDetail}</span>
        </div>
        <div class="rc-bottom">
            <div class="rc-people">
                <div class="rc-avatars">${avatarsHTML}</div>
                <span>${r.participants.length}/${r.maxPassengers}명</span>
                ${full ? '<span class="status-pill full">마감</span>' : '<span class="status-pill recruiting">모집중</span>'}
            </div>
            <div class="rc-fare">
                <div class="rc-fare-label">1인당</div>
                <div class="rc-fare-value">${fmtKRW(farePerPerson)}</div>
            </div>
        </div>
    `;
    return card;
}

// ==================== 렌더링: 홈 ====================
async function renderHome() {
    $('#greet-text').textContent = `안녕하세요, ${state.user.name}님 👋`;

    try {
        await Promise.all([fetchAllRides(), fetchMyRides()]);
    } catch (err) {
        toast(err.message);
        return;
    }

    const myUpcoming = state.myRides
        .filter(r => !isPast(r))
        .sort(byDateTimeAsc);
    renderRideList('#upcoming-rides', myUpcoming.slice(0, 2), {
        empty: { emoji: '🗓', msg: '예정된 합승이 없어요\n검색하거나 새로 등록해보세요' }
    });

    const trending = state.rides
        .filter(r => !isParticipant(r, state.user.id) && !isFull(r) && !isPast(r))
        .sort(byDateTimeAsc)
        .slice(0, 4);
    renderRideList('#trending-rides', trending, {
        empty: { emoji: '🚕', msg: '모집 중인 합승이 없어요' }
    });
}

// ==================== 렌더링: 검색 ====================
function populateAreaSelects() {
    const opts = ['<option value="">전체</option>'].concat(AREAS.map(a => `<option value="${a}">${a}</option>`)).join('');
    $('#filter-area').innerHTML = opts;

    const optsCreate = ['<option value="">선택</option>'].concat(AREAS.map(a => `<option value="${a}">${a}</option>`)).join('');
    $('#create-area').innerHTML = optsCreate;
}

async function runSearch() {
    const filters = {
        airport: $('#filter-airport').value,
        area: $('#filter-area').value,
        date: $('#filter-date').value,
        timeBucket: $('#filter-time').value,
    };

    try {
        await fetchAllRides(filters);
    } catch (err) {
        toast(err.message);
        return;
    }

    const results = state.rides.filter(r => !isPast(r) && !isFull(r)).sort(byDateTimeAsc);

    $('#search-count').textContent = `총 ${results.length}건`;
    renderRideList('#search-results', results, {
        empty: { emoji: '🔍', msg: '조건에 맞는 합승이 없어요\n직접 등록해서 모집해보세요' }
    });
}

// ==================== 등록 ====================
function setupCreateForm() {
    const form = $('#create-form');
    const fareInput = $('#create-fare');
    const maxInput = $('#create-max');
    const updateFarePreview = () => {
        const fare = parseInt(fareInput.value, 10) || 0;
        const max = parseInt(maxInput.value, 10) || 1;
        if (fare > 0) $('#fare-per-person').textContent = fmtKRW(Math.ceil(fare / max));
        else $('#fare-per-person').textContent = '-';
    };
    fareInput.addEventListener('input', updateFarePreview);
    maxInput.addEventListener('change', updateFarePreview);

    const airportRadios = form.querySelectorAll('input[name="airport"]');
    const terminalField = $('#terminal-field');
    const updateTerminalField = () => {
        const selected = [...airportRadios].find(r => r.checked).value;
        terminalField.style.display = selected === '인천' ? '' : 'none';
    };
    airportRadios.forEach(r => r.addEventListener('change', updateTerminalField));
    updateTerminalField();

    const today = new Date();
    $('#create-date').min = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const airport = form.querySelector('input[name="airport"]:checked').value;
        const terminal = airport === '인천' ? ($('#create-terminal').value || null) : null;
        const body = {
            airport,
            terminal,
            departureArea: $('#create-area').value,
            departureDetail: $('#create-detail').value.trim(),
            date: $('#create-date').value,
            time: $('#create-time').value,
            maxPassengers: parseInt($('#create-max').value, 10),
            estimatedFare: parseInt($('#create-fare').value, 10),
            note: $('#create-note').value.trim(),
        };

        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = '등록 중...';
        try {
            await api('/rides', { method: 'POST', body, auth: true });
            toast('합승을 등록했어요');
            form.reset();
            updateFarePreview();
            updateTerminalField();
            navigate('my-rides');
        } catch (err) {
            toast(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '합승 등록하기';
        }
    });
}

// ==================== 내 합승 ====================
async function renderMyRides() {
    try {
        await fetchMyRides();
    } catch (err) {
        toast(err.message);
        return;
    }

    const mine = state.myRides;
    const created = mine.filter(r => r.creatorId === state.user.id && !isPast(r));
    const upcoming = mine.filter(r => !isPast(r)).sort(byDateTimeAsc);
    const past = mine.filter(r => isPast(r)).sort(byDateTimeDesc);

    $('#count-upcoming').textContent = upcoming.length;
    $('#count-created').textContent = created.length;
    $('#count-past').textContent = past.length;

    const tab = state.myRidesTab;
    const list = tab === 'created' ? created : (tab === 'past' ? past : upcoming);
    const emptyMsg = tab === 'past'
        ? { emoji: '📭', msg: '지난 합승이 없어요' }
        : tab === 'created'
        ? { emoji: '📢', msg: '아직 모집 중인 합승이 없어요' }
        : { emoji: '🗓', msg: '예정된 합승이 없어요' };
    renderRideList('#my-rides-list', list, { empty: emptyMsg });
}

// ==================== 상세 ====================
async function openDetail(rideId) {
    navigate('detail');
    $('#detail-body').innerHTML = '<div class="empty-state"><p>불러오는 중...</p></div>';
    try {
        const data = await api('/rides/' + rideId);
        state.detailRide = data.ride;
        renderDetail();
    } catch (err) {
        $('#detail-body').innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span><p>${err.message}</p></div>`;
    }
}

function renderDetail() {
    const r = state.detailRide;
    if (!r) { navigate('home'); return; }

    const mine = isParticipant(r, state.user.id);
    const isCreator = r.creatorId === state.user.id;
    const full = isFull(r);
    const past = isPast(r);
    const perPerson = Math.ceil(r.estimatedFare / r.maxPassengers);
    const airportLabel = r.airport + (r.terminal ? ' ' + r.terminal : '');

    let actionHTML = '';
    if (past) {
        actionHTML = `<button class="btn-ghost" disabled style="width:100%; opacity:0.6;">종료된 합승</button>`;
    } else if (isCreator) {
        actionHTML = `<button class="btn-primary btn-coral" id="cancel-ride-btn">합승 취소</button>`;
    } else if (mine) {
        actionHTML = `<button class="btn-ghost" id="leave-ride-btn" style="width:100%; border:1.5px solid var(--coral); color:var(--coral);">합승 나가기</button>`;
    } else if (full) {
        actionHTML = `<button class="btn-primary" disabled style="opacity:0.5;">마감된 합승</button>`;
    } else {
        actionHTML = `<button class="btn-primary" id="join-ride-btn">합승 참여하기</button>`;
    }

    const participantsHTML = r.participants.map(p => `
        <div class="participant">
            <div class="avatar">${p.name.slice(-1)}</div>
            <div class="participant-info">
                <div class="name">${p.name} ${p.id === r.creatorId ? '<span class="creator-badge">모집자</span>' : ''}</div>
                <div class="meta">${p.company} · ${p.role}${p.rating ? ` · ⭐ ${p.rating}` : ''}</div>
            </div>
        </div>
    `).join('');

    const emptySlots = r.maxPassengers - r.participants.length;
    const emptyHTML = emptySlots > 0
        ? `<div class="participant" style="opacity:0.5"><div class="avatar empty">+</div><div class="participant-info"><div class="name">빈 자리 ${emptySlots}개</div><div class="meta">참여를 기다리는 중</div></div></div>`
        : '';

    $('#detail-body').innerHTML = `
        <div class="detail-hero">
            <div class="route">${r.departureArea} → ${airportLabel}</div>
            <div class="dt">${fmtDate(r.date)} · ${r.time} 출발</div>
        </div>

        <div class="detail-section">
            <h4>상세 정보</h4>
            <div class="detail-kv"><span>출발지</span><span>${r.departureDetail}</span></div>
            <div class="detail-kv"><span>목적지</span><span>${airportLabel}</span></div>
            <div class="detail-kv"><span>예상 택시비</span><span>${fmtKRW(r.estimatedFare)}</span></div>
            <div class="detail-kv"><span>1인당 분담액</span><span style="color:var(--navy);">${fmtKRW(perPerson)}</span></div>
            ${r.note ? `<div class="detail-kv"><span>메모</span><span style="text-align:right;max-width:60%;">${r.note}</span></div>` : ''}
        </div>

        <div class="detail-section">
            <h4>참여자 (${r.participants.length}/${r.maxPassengers})</h4>
            ${participantsHTML}
            ${emptyHTML}
        </div>

        <div class="detail-section" style="background: var(--sky-soft);">
            <h4 style="color: var(--navy);">💡 합승 안내</h4>
            <p style="font-size:13px; color:var(--text-2); line-height:1.6;">
                • 출발 시간 10분 전까지 집결지에 도착해주세요<br>
                • 택시비는 내릴 때 균등 분담하거나 모집자에게 송금<br>
                • 매칭된 멤버의 전화번호는 참여 확정 후 공유됩니다<br>
                • 합승 취소는 출발 2시간 전까지만 가능합니다
            </p>
        </div>

        <div class="action-bar">
            ${actionHTML}
        </div>
    `;

    const joinBtn = $('#join-ride-btn');
    if (joinBtn) joinBtn.addEventListener('click', joinRide);
    const leaveBtn = $('#leave-ride-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', leaveRide);
    const cancelBtn = $('#cancel-ride-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelRide);
}

async function joinRide() {
    const r = state.detailRide;
    if (!r) return;
    const ok = await confirmModal('합승 참여', `${r.departureArea} → ${r.airport} 합승에 참여하시겠어요?\n1인당 약 ${fmtKRW(Math.ceil(r.estimatedFare / r.maxPassengers))}`);
    if (!ok) return;
    try {
        const data = await api(`/rides/${r.id}/join`, { method: 'POST', auth: true });
        state.detailRide = data.ride;
        toast('합승에 참여했어요 🚕');
        renderDetail();
    } catch (err) {
        toast(err.message);
    }
}

async function leaveRide() {
    const r = state.detailRide;
    if (!r) return;
    const ok = await confirmModal('합승 나가기', '정말 이 합승에서 나가시겠어요?');
    if (!ok) return;
    try {
        const data = await api(`/rides/${r.id}/leave`, { method: 'POST', auth: true });
        state.detailRide = data.ride;
        toast('합승에서 나왔어요');
        renderDetail();
    } catch (err) {
        toast(err.message);
    }
}

async function cancelRide() {
    const r = state.detailRide;
    if (!r) return;
    const ok = await confirmModal('합승 취소', '합승을 취소하면 모든 참여자에게 알림이 갑니다. 진행할까요?');
    if (!ok) return;
    try {
        await api(`/rides/${r.id}`, { method: 'DELETE', auth: true });
        toast('합승을 취소했어요');
        navigate('my-rides');
    } catch (err) {
        toast(err.message);
    }
}

// ==================== 프로필 ====================
async function renderProfile() {
    const u = state.user;
    try {
        await fetchMyRides();
    } catch {}
    const myRidesCount = state.myRides.length;
    const createdCount = state.myRides.filter(r => r.creatorId === u.id).length;

    $('#profile-body').innerHTML = `
        <div class="profile-head">
            <div class="profile-avatar">${u.name.slice(0,1)}</div>
            <div class="name">${u.name}</div>
            <div class="meta">${u.company} · ${u.role}</div>
            <div class="badge-verified">✓ 재직 인증 완료</div>
        </div>
        <div>
            <div class="profile-kv"><span>사번</span><span>${u.employeeId}</span></div>
            <div class="profile-kv"><span>연락처</span><span>${u.phone || '-'}</span></div>
            <div class="profile-kv"><span>참여 합승</span><span>${myRidesCount}회</span></div>
            <div class="profile-kv"><span>모집한 합승</span><span>${createdCount}회</span></div>
            <div class="profile-kv"><span>매너 평점</span><span>⭐ ${u.rating || '5.0'}</span></div>
        </div>
        <button class="logout-btn" id="logout-btn">로그아웃</button>
    `;
    $('#logout-btn').addEventListener('click', logout);
}

async function logout() {
    const ok = await confirmModal('로그아웃', '로그아웃하시겠어요?');
    if (!ok) return;
    clearToken();
    state.user = null;
    $('#main-layout').classList.add('hidden');
    $('#auth-screen').classList.add('active');
}

// ==================== 라우팅 ====================
function navigate(screen) {
    if (screen === 'back') {
        const prev = state.navHistory.pop() || 'home';
        screen = prev;
    } else {
        if (state.currentScreen && state.currentScreen !== screen) {
            state.navHistory.push(state.currentScreen);
            if (state.navHistory.length > 10) state.navHistory.shift();
        }
    }

    $$('.screen').forEach(s => s.classList.remove('active'));
    const target = $(`#${screen}-screen`);
    if (target) target.classList.add('active');
    state.currentScreen = screen;

    $$('.bottom-nav .nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.nav === screen);
    });

    window.scrollTo(0, 0);

    if (screen === 'home') renderHome();
    if (screen === 'search') { populateAreaSelects(); runSearch(); }
    if (screen === 'my-rides') renderMyRides();
    if (screen === 'profile') renderProfile();
    if (screen === 'create') populateAreaSelects();
}

// ==================== 인증 ====================
function setAuthMode(mode) {
    state.authMode = mode;
    document.body.classList.toggle('mode-signup', mode === 'signup');
    $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    $('#auth-submit').textContent = mode === 'signup' ? '가입하기' : '로그인';
}

function initAuth() {
    $$('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => setAuthMode(tab.dataset.mode));
    });

    $('#auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('#auth-submit');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '처리 중...';

        try {
            let data;
            if (state.authMode === 'signup') {
                const body = {
                    name: $('#auth-name').value.trim(),
                    company: $('#auth-company').value,
                    role: $('#auth-role').value,
                    employeeId: $('#auth-employee-id').value.trim(),
                    phone: $('#auth-phone').value.trim(),
                    password: $('#auth-password').value,
                };
                if (!body.name || !body.company || !body.role || !body.phone) {
                    throw new Error('모든 항목을 입력해주세요');
                }
                data = await api('/auth/register', { method: 'POST', body });
            } else {
                const body = {
                    employeeId: $('#auth-employee-id').value.trim(),
                    password: $('#auth-password').value,
                };
                data = await api('/auth/login', { method: 'POST', body });
            }

            setToken(data.token);
            state.user = data.user;
            await enterApp();
        } catch (err) {
            toast(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

async function tryAutoLogin() {
    if (!getToken()) return false;
    try {
        const data = await api('/auth/me', { auth: true });
        state.user = data.user;
        return true;
    } catch {
        clearToken();
        return false;
    }
}

async function enterApp() {
    hideBackendBanner();
    $('#auth-screen').classList.remove('active');
    $('#main-layout').classList.remove('hidden');
    $('#user-chip').textContent = state.user.name + ' · ' + state.user.company;
    populateAreaSelects();
    navigate('home');
}

function bindGlobalEvents() {
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-nav]');
        if (navBtn) {
            const target = navBtn.dataset.nav;
            navigate(target);
        }
    });

    $('#search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch();
    });

    $$('.tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.myRidesTab = tab.dataset.tab;
            renderMyRides();
        });
    });

    setupCreateForm();
}

async function start() {
    bindGlobalEvents();
    populateAreaSelects();
    initAuth();
    setAuthMode('login');

    try {
        await fetch(API_BASE + '/health');
        hideBackendBanner();
    } catch {
        showBackendBanner();
    }

    const loggedIn = await tryAutoLogin();
    if (loggedIn) await enterApp();
}

document.addEventListener('DOMContentLoaded', start);
