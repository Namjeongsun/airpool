/* =========================================================
   AirPool Admin · Vanilla JS
   ========================================================= */

/* ---------- MOCK DATA GENERATORS ---------- */
const COMPANIES = ['대한항공', '아시아나항공', '제주항공', '티웨이항공', '에어서울', '인천국제공항공사', '한국공항공사', 'SK에어포트서비스', 'KAC공항서비스'];
const ROLES = ['객실승무원', '운항승무원', '지상직', '정비사', '보안요원', '공항 운영', '관제 지원', '램프 서비스'];
const FIRST = ['민준','서연','지후','하윤','도윤','서아','시우','하은','예준','수아','지호','지우','주원','지민','건우','유나','우진','채원','현우','지아','민서','소율','준서','시윤','다은','승우','소현','태윤','나윤','시현'];
const LAST  = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','전'];
const AIRPORTS = ['인천 T1', '인천 T2', '김포'];
const DEPARTURES = ['강남구','서초구','송파구','강동구','마포구','용산구','영등포구','구로구','관악구','동작구','성동구','광진구','노원구','강서구','양천구','일산 동구','분당구','판교','수원','부천','광명','인천 송도','의정부','고양 덕양'];
const RIDE_STATUS = ['모집중','마감','완료','취소'];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function makeName(){ return pick(LAST)+pick(FIRST); }
function pad(n){ return n<10 ? '0'+n : ''+n; }
function dateStr(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateTimeStr(d){ return `${dateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d; }
function hoursFromNow(h){ const d=new Date(); d.setHours(d.getHours()+h); return d; }
function won(n){ return '₩' + n.toLocaleString('ko-KR'); }

let _seed = 42;
function sRand(){ _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; }
function sPick(arr){ return arr[Math.floor(sRand()*arr.length)]; }
function sInt(a,b){ return Math.floor(sRand()*(b-a+1))+a; }
function sName(){ return sPick(LAST) + sPick(FIRST); }

/* Seeded users (30) */
function genUsers(){
  _seed = 42;
  const users = [];
  for (let i=0; i<30; i++){
    const company = sPick(COMPANIES);
    const role = sPick(ROLES);
    const joined = daysAgo(sInt(5, 400));
    users.push({
      id: 'U' + String(10000 + i),
      name: sName(),
      company, role,
      empId: String(sInt(1000, 99999)).padStart(5,'0'),
      joinedAt: dateStr(joined),
      rides: sInt(0, 58),
      rating: (3.8 + sRand()*1.2).toFixed(1),
      status: sRand() > 0.92 ? '정지' : '활성',
    });
  }
  return users;
}

/* Seeded pending verifications (13) */
function genVerifications(){
  _seed = 101;
  const arr = [];
  for (let i=0; i<13; i++){
    arr.push({
      id: 'V' + String(500 + i),
      name: sName(),
      company: sPick(COMPANIES),
      role: sPick(ROLES),
      empId: String(sInt(1000, 99999)).padStart(5,'0'),
      requestedAt: dateStr(daysAgo(sInt(0, 8))),
      status: '대기',
      reason: null,
    });
  }
  return arr;
}

/* Seeded rides (25) */
function genRides(){
  _seed = 201;
  const arr = [];
  for (let i=0; i<25; i++){
    const airport = sPick(AIRPORTS);
    const dep = sPick(DEPARTURES);
    const offsetH = sInt(-48, 120);
    const when = hoursFromNow(offsetH);
    const status = offsetH < -6 ? (sRand() > 0.15 ? '완료' : '취소') :
                   offsetH < 0 ? '마감' :
                   sRand() > 0.75 ? '마감' : '모집중';
    const cap = sPick([3,4,4,4]);
    const joined = status === '모집중' ? sInt(1, cap-1) : cap;
    const fare = sInt(18, 42) * 1000;
    arr.push({
      id: 'R' + String(7000 + i),
      from: dep,
      to: airport,
      when: dateTimeStr(when),
      host: sName(),
      seats: `${joined}/${cap}`,
      fare,
      status,
    });
  }
  return arr;
}

/* Seeded reports (7) */
function genReports(){
  _seed = 301;
  const types = ['노쇼','매너 문제','요금 분쟁','기타'];
  const statuses = ['접수','처리중','완료'];
  const arr = [];
  for (let i=0; i<7; i++){
    arr.push({
      id: 'RP' + String(120 + i),
      reporter: sName(),
      reported: sName(),
      type: sPick(types),
      rideId: 'R' + String(7000 + sInt(0,24)),
      createdAt: dateStr(daysAgo(sInt(0, 20))),
      status: sPick(statuses),
      description: '신고 내용 · 합승 당일 관련 분쟁이 발생했습니다. 운영자 검토가 필요합니다.',
    });
  }
  return arr;
}

/* ---------- STATE ---------- */
const LS = {
  AUTH: 'airpool_admin_auth',
  VERIFY: 'airpool_admin_verifications',
  USERS: 'airpool_admin_users',
  RIDES: 'airpool_admin_rides',
  REPORTS: 'airpool_admin_reports',
  SETTINGS: 'airpool_admin_settings',
};

const state = {
  section: 'dashboard',
  users: loadOrInit(LS.USERS, genUsers),
  verifications: loadOrInit(LS.VERIFY, genVerifications),
  rides: loadOrInit(LS.RIDES, genRides),
  reports: loadOrInit(LS.REPORTS, genReports),
  settings: loadOrInit(LS.SETTINGS, () => ({
    feeRate: 8,
    autoApprove: false,
    notice: '',
    admins: [
      { name: '김운영', email: 'ledtruff@gmail.com', role: '슈퍼 관리자' },
      { name: '박주임', email: 'ops@airpool.kr', role: '운영' },
      { name: '이매니저', email: 'cs@airpool.kr', role: 'CS' },
    ],
  })),
  filters: {
    verify: 'all',
    users: { company: '', role: '', status: '', q: '', page: 1, sort: null, dir: 1 },
    rides: { status: '', airport: '', q: '', sort: null, dir: 1 },
    reports: { status: '' },
  },
};

function loadOrInit(key, gen){
  const raw = localStorage.getItem(key);
  if (raw){ try { return JSON.parse(raw); } catch(e){} }
  const d = gen();
  localStorage.setItem(key, JSON.stringify(d));
  return d;
}
function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }

/* ---------- AUTH ---------- */
function isLoggedIn(){ return localStorage.getItem(LS.AUTH) === '1'; }
function showLogin(){
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}
function showApp(){
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  const hash = location.hash.replace('#/','') || 'dashboard';
  setSection(hash);
  updateBadges();
}
function logout(){
  localStorage.removeItem(LS.AUTH);
  showLogin();
  toast('로그아웃되었습니다.', 'ok');
}

/* ---------- TOASTS / MODALS ---------- */
function toast(msg, type='info'){
  const host = document.getElementById('toast-host');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

function openModal(html, onMount){
  const host = document.getElementById('modal-host');
  host.innerHTML = html;
  host.classList.remove('hidden');
  host.onclick = (e) => { if (e.target === host) closeModal(); };
  const closeBtns = host.querySelectorAll('[data-close]');
  closeBtns.forEach(b => b.onclick = closeModal);
  if (onMount) onMount(host);
}
function closeModal(){
  const host = document.getElementById('modal-host');
  host.classList.add('hidden');
  host.innerHTML = '';
}

function confirmModal({ title, body, confirmLabel='확인', danger=false, onConfirm }){
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>취소</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cm-ok">${confirmLabel}</button>
      </div>
    </div>
  `, (host) => {
    host.querySelector('#cm-ok').onclick = () => { onConfirm && onConfirm(host); closeModal(); };
  });
}

/* ---------- BADGES / HEADER ---------- */
function updateBadges(){
  const pending = state.verifications.filter(v => v.status === '대기').length;
  const badgeSide = document.getElementById('nav-badge-verify');
  badgeSide.textContent = pending;
  badgeSide.classList.toggle('zero', pending === 0);
  const badgeTop = document.getElementById('notify-badge');
  badgeTop.textContent = pending;
  badgeTop.classList.toggle('zero', pending === 0);
}

const PAGE_META = {
  dashboard:    { title: '대시보드',     sub: '운영 현황 한눈에 보기' },
  verifications:{ title: '재직 인증 관리', sub: '사원증 제출 검수 및 승인/반려' },
  users:        { title: '사용자 관리',   sub: '가입 사용자 전체 목록과 상태 관리' },
  rides:        { title: '합승 관리',     sub: '생성된 합승 일정과 진행 상태' },
  reports:      { title: '신고/분쟁 관리', sub: '사용자 신고 접수 및 처리' },
  analytics:    { title: '분석',          sub: '주요 지표 상세 분석' },
  settings:     { title: '설정',          sub: '운영 정책 및 관리자 계정' },
};

/* ---------- ROUTER ---------- */
function setSection(name){
  if (!PAGE_META[name]) name = 'dashboard';
  state.section = name;
  document.getElementById('page-title').textContent = PAGE_META[name].title;
  document.getElementById('page-sub').textContent = PAGE_META[name].sub;
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });
  const content = document.getElementById('content');
  content.innerHTML = '';
  switch(name){
    case 'dashboard':     renderDashboard(content); break;
    case 'verifications': renderVerifications(content); break;
    case 'users':         renderUsers(content); break;
    case 'rides':         renderRides(content); break;
    case 'reports':       renderReports(content); break;
    case 'analytics':     renderAnalytics(content); break;
    case 'settings':      renderSettings(content); break;
  }
}

/* ---------- DASHBOARD ---------- */
function renderDashboard(root){
  const pending = state.verifications.filter(v => v.status === '대기').length;
  const kpis = [
    { label:'전체 가입자 수',    val: '1,247',       delta:'+12', trend:'up',   color:'var(--sky)' },
    { label:'재직 인증 대기',    val: String(pending), delta:`${pending}건 검토 필요`, trend:'flat', color:'var(--warn)' },
    { label:'오늘 매칭된 합승',  val: '184',         delta:'+23%', trend:'up',   color:'#7c3aed' },
    { label:'이번 달 완료 합승', val: '3,921',       delta:'+8.4%', trend:'up',   color:'var(--ok)' },
    { label:'신고 건수',         val: '3',           delta:'-1 vs 어제', trend:'down', color:'var(--coral)' },
    { label:'예상 월 매출',      val: '₩9,870,000', delta:'+14.2%', trend:'up', color:'var(--navy)' },
  ];

  const kpiHTML = kpis.map(k => `
    <div class="kpi">
      <div class="kpi-label"><span class="kpi-dot" style="background:${k.color}"></span>${k.label}</div>
      <div class="kpi-value">${k.val}</div>
      <div class="kpi-delta ${k.trend}">
        ${k.trend === 'up' ? '▲' : k.trend === 'down' ? '▼' : '•'} ${k.delta}
      </div>
    </div>
  `).join('');

  // 14-day bar data
  _seed = 7;
  const bars = Array.from({length: 14}, (_,i) => 110 + sInt(30, 140));
  const max = Math.max(...bars);
  const labels = Array.from({length: 14}, (_,i) => {
    const d = daysAgo(13 - i);
    return `${d.getMonth()+1}/${d.getDate()}`;
  });

  // airport distribution
  const airports = [
    { name:'인천 T1', value: 52, color:'#3b82f6' },
    { name:'인천 T2', value: 31, color:'#0a2540' },
    { name:'김포',    value: 17, color:'#60a5fa' },
  ];

  // activity feed
  const feed = [
    { type:'signup', title:'신규 가입 · 김서연', desc:'대한항공 객실승무원 · 재직 인증 대기', time:'방금 전' },
    { type:'verify', title:'인증 승인 · 박지후',  desc:'인천국제공항공사 공항 운영 · 자동 승인', time:'7분 전' },
    { type:'ride',   title:'합승 완료 · R7012',  desc:'강남구 → 인천 T1 · 4인 매칭 · ₩32,000', time:'23분 전' },
    { type:'report', title:'신고 접수 · RP126',  desc:'노쇼 신고 · 처리 필요', time:'1시간 전' },
    { type:'settle', title:'정산 발행',          desc:'3월 둘째 주 기사 정산 완료 · ₩2,145,000', time:'오늘 09:12' },
    { type:'signup', title:'신규 가입 · 최우진',  desc:'제주항공 지상직 · 사원증 제출', time:'어제' },
  ];

  root.innerHTML = `
    <div class="kpi-grid">${kpiHTML}</div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">일별 매칭 추이 (최근 14일)</h3>
          <span class="pill info">완료 기준</span>
        </div>
        <div class="card-body chart-wrap">
          <div class="bar-chart">
            ${bars.map((v,i) => `
              <div class="bar" style="height:${(v/max)*100}%">
                <span class="bar-val">${v}</span>
              </div>
            `).join('')}
          </div>
          <div class="bar-labels">
            ${labels.map(l => `<span>${l}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3 class="card-title">공항별 분포</h3>
          <span class="pill muted">이번 달</span>
        </div>
        <div class="card-body">
          ${renderDonut(airports)}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3 class="card-title">최근 활동</h3>
        <button class="btn-ghost btn-sm">전체 보기</button>
      </div>
      <div class="card-body flush">
        <div class="feed">
          ${feed.map(f => `
            <div class="feed-item">
              <div class="feed-ico ${f.type}">
                ${f.type === 'signup' ? '+' : f.type === 'verify' ? '✓' : f.type === 'ride' ? '🚕'.slice(0,1) || 'R' : f.type === 'report' ? '!' : '₩'}
              </div>
              <div class="feed-main">
                <div class="feed-title">${f.title}</div>
                <div class="feed-desc">${f.desc}</div>
              </div>
              <div class="feed-time">${f.time}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderDonut(items){
  const total = items.reduce((a,b) => a+b.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  const segs = items.map(it => {
    const frac = it.value / total;
    const seg = {
      color: it.color,
      len: frac * c,
      offset: -acc,
    };
    acc += frac * c;
    return seg;
  });
  const legendHTML = items.map(it => `
    <div class="lg-item">
      <span class="lg-dot" style="background:${it.color}"></span>
      <span>${it.name}</span>
      <span class="lg-val">${it.value}%</span>
    </div>
  `).join('');
  return `
    <div class="donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="#eef2f8" stroke-width="18"/>
        ${segs.map(s => `
          <circle cx="70" cy="70" r="${r}" fill="none"
            stroke="${s.color}" stroke-width="18"
            stroke-dasharray="${s.len} ${c - s.len}"
            stroke-dashoffset="${s.offset}"
            transform="rotate(-90 70 70)"/>
        `).join('')}
        <text x="70" y="68" text-anchor="middle" font-size="11" fill="#94a3b8">총</text>
        <text x="70" y="84" text-anchor="middle" font-size="18" font-weight="800" fill="#0a2540">${total}%</text>
      </svg>
      <div class="donut-legend">${legendHTML}</div>
    </div>
  `;
}

/* ---------- VERIFICATIONS ---------- */
function renderVerifications(root){
  const filter = state.filters.verify;
  let list = state.verifications;
  if (filter === 'pending')  list = list.filter(v => v.status === '대기');
  if (filter === 'approved') list = list.filter(v => v.status === '승인완료');
  if (filter === 'rejected') list = list.filter(v => v.status === '반려');

  root.innerHTML = `
    <div class="toolbar">
      <div class="tab-group" id="verify-tabs">
        ${[['all','전체'],['pending','대기'],['approved','승인'],['rejected','반려']].map(([k,l]) => `
          <button class="tab ${filter === k ? 'active' : ''}" data-tab="${k}">${l}</button>
        `).join('')}
      </div>
      <div class="tb-spacer"></div>
      <span class="pill warn">대기 ${state.verifications.filter(v=>v.status==='대기').length}</span>
      <span class="pill ok">승인 ${state.verifications.filter(v=>v.status==='승인완료').length}</span>
      <span class="pill err">반려 ${state.verifications.filter(v=>v.status==='반려').length}</span>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>이름</th>
              <th>소속</th>
              <th>직무</th>
              <th>사번</th>
              <th>신청일</th>
              <th>사원증</th>
              <th>상태</th>
              <th style="text-align:right">액션</th>
            </tr>
          </thead>
          <tbody id="verify-tbody">
            ${list.length === 0 ? `<tr><td colspan="8" class="empty-row">데이터가 없습니다.</td></tr>` :
              list.map(v => verifyRow(v)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelectorAll('#verify-tabs .tab').forEach(btn => {
    btn.onclick = () => { state.filters.verify = btn.dataset.tab; renderVerifications(root); };
  });
  bindVerifyActions(root);
}

function verifyRow(v){
  const pill = v.status === '대기' ? '<span class="pill warn">대기</span>'
             : v.status === '승인완료' ? '<span class="pill ok">승인완료</span>'
             : '<span class="pill err">반려</span>';
  const actions = v.status === '대기'
    ? `<div class="row-actions">
         <button class="btn btn-outline btn-sm" data-view="${v.id}">사원증 보기</button>
         <button class="btn btn-ok btn-sm" data-approve="${v.id}">승인</button>
         <button class="btn btn-danger btn-sm" data-reject="${v.id}">반려</button>
       </div>`
    : `<div class="row-actions">
         <button class="btn btn-outline btn-sm" data-view="${v.id}">상세</button>
       </div>`;
  return `
    <tr data-vid="${v.id}">
      <td><div class="user-cell"><div class="avatar-sm">${v.name[0]}</div><div><div class="u-name">${v.name}</div><div class="u-meta">${v.id}</div></div></div></td>
      <td>${v.company}</td>
      <td>${v.role}</td>
      <td class="mono">${v.empId}</td>
      <td>${v.requestedAt}</td>
      <td><button class="btn-ghost btn-sm" data-badge="${v.id}">보기</button></td>
      <td>${pill}</td>
      <td class="actions">${actions}</td>
    </tr>`;
}

function bindVerifyActions(root){
  root.querySelectorAll('[data-badge], [data-view]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.badge || b.dataset.view;
      const v = state.verifications.find(x => x.id === id);
      openBadgeModal(v);
    };
  });
  root.querySelectorAll('[data-approve]').forEach(b => {
    b.onclick = () => approveVerify(b.dataset.approve);
  });
  root.querySelectorAll('[data-reject]').forEach(b => {
    b.onclick = () => openRejectModal(b.dataset.reject);
  });
}

function openBadgeModal(v){
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">사원증 확인 · ${v.name}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <div class="badge-photo">
          <div class="bp-lbl">Employee ID Card · ${v.company}</div>
          <div class="bp-name">${v.name}</div>
          <div class="bp-meta">${v.role} · 사번 ${v.empId}</div>
          <div class="bp-meta" style="margin-top:12px; font-size:11px; color:var(--text-3);">[사원증 이미지 ${v.name}]</div>
        </div>
        <dl class="info-grid" style="margin-top:18px">
          <dt>신청 ID</dt><dd class="mono">${v.id}</dd>
          <dt>소속</dt><dd>${v.company}</dd>
          <dt>직무</dt><dd>${v.role}</dd>
          <dt>사번</dt><dd class="mono">${v.empId}</dd>
          <dt>신청일</dt><dd>${v.requestedAt}</dd>
          <dt>상태</dt><dd>${v.status}</dd>
          ${v.reason ? `<dt>반려 사유</dt><dd style="color:var(--coral)">${v.reason}</dd>` : ''}
        </dl>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>닫기</button>
        ${v.status === '대기' ? `
          <button class="btn btn-danger" id="bm-reject">반려</button>
          <button class="btn btn-ok" id="bm-approve">승인</button>
        ` : ''}
      </div>
    </div>
  `, (host) => {
    const appr = host.querySelector('#bm-approve');
    const rej = host.querySelector('#bm-reject');
    if (appr) appr.onclick = () => { closeModal(); approveVerify(v.id); };
    if (rej)  rej.onclick  = () => { closeModal(); openRejectModal(v.id); };
  });
}

function approveVerify(id){
  const v = state.verifications.find(x => x.id === id);
  if (!v) return;
  v.status = '승인완료';
  save(LS.VERIFY, state.verifications);
  const tr = document.querySelector(`tr[data-vid="${id}"]`);
  if (tr){
    tr.classList.add('fade-out');
    setTimeout(() => { renderVerifications(document.getElementById('content')); updateBadges(); }, 400);
  } else {
    renderVerifications(document.getElementById('content'));
    updateBadges();
  }
  toast(`${v.name}님 재직 인증 승인 완료`, 'ok');
}

function openRejectModal(id){
  const v = state.verifications.find(x => x.id === id);
  if (!v) return;
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">재직 인증 반려 · ${v.name}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 10px; color:var(--text-2); font-size:13px;">반려 사유를 입력하세요. 신청자에게 알림으로 전달됩니다.</p>
        <textarea class="textarea" id="rej-reason" placeholder="예: 사원증 이미지가 흐릿하여 확인이 어렵습니다. 재업로드 부탁드립니다."></textarea>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>취소</button>
        <button class="btn btn-danger" id="rej-confirm">반려 확정</button>
      </div>
    </div>
  `, (host) => {
    host.querySelector('#rej-confirm').onclick = () => {
      const reason = host.querySelector('#rej-reason').value.trim() || '사유 미입력';
      v.status = '반려';
      v.reason = reason;
      save(LS.VERIFY, state.verifications);
      closeModal();
      renderVerifications(document.getElementById('content'));
      updateBadges();
      toast(`${v.name}님 재직 인증 반려 처리됨`, 'warn');
    };
  });
}

/* ---------- USERS ---------- */
function renderUsers(root){
  const f = state.filters.users;
  let list = state.users.slice();

  if (f.company) list = list.filter(u => u.company === f.company);
  if (f.role)    list = list.filter(u => u.role === f.role);
  if (f.status)  list = list.filter(u => u.status === f.status);
  if (f.q){
    const q = f.q.toLowerCase();
    list = list.filter(u => u.name.toLowerCase().includes(q) || u.empId.includes(f.q));
  }

  if (f.sort){
    list.sort((a,b) => {
      const av = a[f.sort], bv = b[f.sort];
      if (typeof av === 'number') return (av - bv) * f.dir;
      return String(av).localeCompare(String(bv), 'ko') * f.dir;
    });
  }

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (f.page > totalPages) f.page = totalPages;
  const start = (f.page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  const compOpts = ['<option value="">전체 소속</option>', ...COMPANIES.map(c => `<option ${f.company===c?'selected':''}>${c}</option>`)].join('');
  const roleOpts = ['<option value="">전체 직무</option>', ...ROLES.map(r => `<option ${f.role===r?'selected':''}>${r}</option>`)].join('');

  const sortIcon = (key) => {
    if (f.sort !== key) return '<span class="sort-ind">↕</span>';
    return `<span class="sort-ind">${f.dir===1?'↑':'↓'}</span>`;
  };
  const sortClass = (key) => {
    if (f.sort !== key) return 'sortable';
    return 'sortable ' + (f.dir===1?'sorted-asc':'sorted-desc');
  };

  root.innerHTML = `
    <div class="toolbar">
      <select class="tb-select" id="u-company">${compOpts}</select>
      <select class="tb-select" id="u-role">${roleOpts}</select>
      <select class="tb-select" id="u-status">
        <option value="">전체 상태</option>
        <option ${f.status==='활성'?'selected':''}>활성</option>
        <option ${f.status==='정지'?'selected':''}>정지</option>
      </select>
      <div class="tb-spacer"></div>
      <input class="tb-input tb-search" id="u-q" placeholder="이름 또는 사번 검색" value="${f.q || ''}" />
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th class="${sortClass('name')}" data-sort="name">이름${sortIcon('name')}</th>
              <th class="${sortClass('company')}" data-sort="company">소속${sortIcon('company')}</th>
              <th class="${sortClass('role')}" data-sort="role">직무${sortIcon('role')}</th>
              <th class="${sortClass('empId')}" data-sort="empId">사번${sortIcon('empId')}</th>
              <th class="${sortClass('joinedAt')}" data-sort="joinedAt">가입일${sortIcon('joinedAt')}</th>
              <th class="${sortClass('rides')}" data-sort="rides">합승 횟수${sortIcon('rides')}</th>
              <th class="${sortClass('rating')}" data-sort="rating">평점${sortIcon('rating')}</th>
              <th>상태</th>
              <th style="text-align:right">액션</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.length === 0 ? `<tr><td colspan="9" class="empty-row">조건에 맞는 사용자가 없습니다.</td></tr>` :
              pageItems.map(u => `
                <tr>
                  <td><div class="user-cell"><div class="avatar-sm">${u.name[0]}</div><div><div class="u-name">${u.name}</div><div class="u-meta">${u.id}</div></div></div></td>
                  <td>${u.company}</td>
                  <td>${u.role}</td>
                  <td class="mono">${u.empId}</td>
                  <td>${u.joinedAt}</td>
                  <td>${u.rides}</td>
                  <td><span class="rating">★ ${u.rating}</span></td>
                  <td>${u.status === '활성' ? '<span class="pill ok">활성</span>' : '<span class="pill err">정지</span>'}</td>
                  <td class="actions">
                    <div class="row-actions">
                      <button class="btn btn-outline btn-sm" data-detail="${u.id}">상세보기</button>
                      <button class="btn ${u.status==='활성'?'btn-danger':'btn-ok'} btn-sm" data-toggle="${u.id}">
                        ${u.status==='활성' ? '정지' : '활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <div>총 <strong>${list.length}</strong>명 · 페이지 ${f.page} / ${totalPages}</div>
        <div class="pager-pages" id="u-pager"></div>
      </div>
    </div>
  `;

  // bindings
  root.querySelector('#u-company').onchange = (e) => { f.company = e.target.value; f.page=1; renderUsers(root); };
  root.querySelector('#u-role').onchange    = (e) => { f.role = e.target.value; f.page=1; renderUsers(root); };
  root.querySelector('#u-status').onchange  = (e) => { f.status = e.target.value; f.page=1; renderUsers(root); };

  const qEl = root.querySelector('#u-q');
  let tq; qEl.oninput = (e) => {
    clearTimeout(tq);
    tq = setTimeout(() => { f.q = e.target.value; f.page=1; renderUsers(root); }, 200);
  };

  root.querySelectorAll('th.sortable').forEach(th => {
    th.onclick = () => {
      const k = th.dataset.sort;
      if (f.sort === k) f.dir = -f.dir; else { f.sort = k; f.dir = 1; }
      renderUsers(root);
    };
  });

  // pager
  const pager = root.querySelector('#u-pager');
  const mkBtn = (p, lbl, disabled=false, active=false) => {
    const b = document.createElement('button');
    b.className = 'pg-btn' + (active ? ' active' : '');
    b.textContent = lbl;
    b.disabled = disabled;
    b.onclick = () => { f.page = p; renderUsers(root); };
    return b;
  };
  pager.appendChild(mkBtn(Math.max(1,f.page-1), '‹', f.page===1));
  for (let p=1; p<=totalPages; p++){
    if (totalPages > 7 && (p > 2 && p < totalPages-1 && Math.abs(p - f.page) > 1)){
      if (p === 3 || p === totalPages-2){
        const s = document.createElement('span'); s.textContent = '…'; s.style.padding='0 6px'; s.style.color='var(--text-3)';
        pager.appendChild(s);
      }
      continue;
    }
    pager.appendChild(mkBtn(p, String(p), false, p===f.page));
  }
  pager.appendChild(mkBtn(Math.min(totalPages,f.page+1), '›', f.page===totalPages));

  // actions
  root.querySelectorAll('[data-detail]').forEach(b => {
    b.onclick = () => openUserDetail(b.dataset.detail);
  });
  root.querySelectorAll('[data-toggle]').forEach(b => {
    b.onclick = () => toggleUserStatus(b.dataset.toggle);
  });
}

function openUserDetail(id){
  const u = state.users.find(x => x.id === id); if (!u) return;
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">사용자 상세 · ${u.name}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <dl class="info-grid">
          <dt>사용자 ID</dt><dd class="mono">${u.id}</dd>
          <dt>이름</dt><dd>${u.name}</dd>
          <dt>소속</dt><dd>${u.company}</dd>
          <dt>직무</dt><dd>${u.role}</dd>
          <dt>사번</dt><dd class="mono">${u.empId}</dd>
          <dt>가입일</dt><dd>${u.joinedAt}</dd>
          <dt>합승 횟수</dt><dd>${u.rides}회</dd>
          <dt>평점</dt><dd><span class="rating">★ ${u.rating}</span></dd>
          <dt>상태</dt><dd>${u.status === '활성' ? '<span class="pill ok">활성</span>' : '<span class="pill err">정지</span>'}</dd>
        </dl>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>닫기</button>
      </div>
    </div>
  `);
}

function toggleUserStatus(id){
  const u = state.users.find(x => x.id === id); if (!u) return;
  const next = u.status === '활성' ? '정지' : '활성';
  confirmModal({
    title: `${u.name}님 ${next} 처리`,
    body: `<p style="margin:0; color:var(--text-2); font-size:13px;">사용자 상태를 <strong>${next}</strong>(으)로 변경하시겠습니까?</p>`,
    confirmLabel: next,
    danger: next === '정지',
    onConfirm: () => {
      u.status = next;
      save(LS.USERS, state.users);
      renderUsers(document.getElementById('content'));
      toast(`${u.name}님 ${next} 처리되었습니다.`, next==='정지'?'warn':'ok');
    },
  });
}

/* ---------- RIDES ---------- */
function renderRides(root){
  const f = state.filters.rides;
  let list = state.rides.slice();
  if (f.status)  list = list.filter(r => r.status === f.status);
  if (f.airport) list = list.filter(r => r.to === f.airport);
  if (f.q){
    const q = f.q.toLowerCase();
    list = list.filter(r => r.id.toLowerCase().includes(q) || r.from.toLowerCase().includes(q) || r.host.toLowerCase().includes(q));
  }
  if (f.sort){
    list.sort((a,b) => {
      const av = a[f.sort], bv = b[f.sort];
      if (typeof av === 'number') return (av - bv) * f.dir;
      return String(av).localeCompare(String(bv)) * f.dir;
    });
  }

  const sortIcon = (k) => f.sort !== k ? '<span class="sort-ind">↕</span>' : `<span class="sort-ind">${f.dir===1?'↑':'↓'}</span>`;
  const sortCls = (k) => f.sort !== k ? 'sortable' : 'sortable ' + (f.dir===1?'sorted-asc':'sorted-desc');

  root.innerHTML = `
    <div class="toolbar">
      <select class="tb-select" id="r-status">
        <option value="">전체 상태</option>
        ${RIDE_STATUS.map(s => `<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="tb-select" id="r-air">
        <option value="">전체 공항</option>
        ${AIRPORTS.map(a => `<option ${f.airport===a?'selected':''}>${a}</option>`).join('')}
      </select>
      <div class="tb-spacer"></div>
      <input class="tb-input tb-search" id="r-q" placeholder="합승 ID · 출발지 · 모집자 검색" value="${f.q||''}"/>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>합승 ID</th>
              <th class="${sortCls('from')}" data-sort="from">경로${sortIcon('from')}</th>
              <th class="${sortCls('when')}" data-sort="when">날짜/시간${sortIcon('when')}</th>
              <th>모집자</th>
              <th>참여</th>
              <th class="${sortCls('fare')}" data-sort="fare">예상 요금${sortIcon('fare')}</th>
              <th>상태</th>
              <th style="text-align:right">액션</th>
            </tr>
          </thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="8" class="empty-row">조건에 맞는 합승이 없습니다.</td></tr>` :
              list.map(r => `
                <tr>
                  <td class="mono">${r.id}</td>
                  <td><strong>${r.from}</strong> <span style="color:var(--text-3)">→</span> ${r.to}</td>
                  <td>${r.when}</td>
                  <td><div class="user-cell"><div class="avatar-sm">${r.host[0]}</div><div class="u-name">${r.host}</div></div></td>
                  <td>${r.seats}</td>
                  <td>${won(r.fare)}</td>
                  <td>${ridePill(r.status)}</td>
                  <td class="actions">
                    <div class="row-actions">
                      <button class="btn btn-outline btn-sm" data-rview="${r.id}">상세</button>
                      ${r.status === '모집중' || r.status === '마감' ? `<button class="btn btn-danger btn-sm" data-rcancel="${r.id}">강제 취소</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelector('#r-status').onchange = e => { f.status = e.target.value; renderRides(root); };
  root.querySelector('#r-air').onchange    = e => { f.airport = e.target.value; renderRides(root); };
  const qEl = root.querySelector('#r-q');
  let t; qEl.oninput = e => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; renderRides(root); }, 200); };
  root.querySelectorAll('th.sortable').forEach(th => {
    th.onclick = () => {
      const k = th.dataset.sort;
      if (f.sort === k) f.dir = -f.dir; else { f.sort = k; f.dir = 1; }
      renderRides(root);
    };
  });
  root.querySelectorAll('[data-rview]').forEach(b => {
    b.onclick = () => openRideDetail(b.dataset.rview);
  });
  root.querySelectorAll('[data-rcancel]').forEach(b => {
    b.onclick = () => cancelRide(b.dataset.rcancel);
  });
}

function ridePill(s){
  return s==='모집중' ? '<span class="pill info">모집중</span>'
       : s==='마감'   ? '<span class="pill warn">마감</span>'
       : s==='완료'   ? '<span class="pill ok">완료</span>'
       :                '<span class="pill err">취소</span>';
}

function openRideDetail(id){
  const r = state.rides.find(x => x.id === id); if (!r) return;
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">합승 상세 · ${r.id}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <dl class="info-grid">
          <dt>경로</dt><dd>${r.from} → ${r.to}</dd>
          <dt>출발 시간</dt><dd>${r.when}</dd>
          <dt>모집자</dt><dd>${r.host}</dd>
          <dt>참여 인원</dt><dd>${r.seats}</dd>
          <dt>예상 요금</dt><dd>${won(r.fare)}</dd>
          <dt>1인 분담액</dt><dd>${won(Math.round(r.fare / parseInt(r.seats.split('/')[1])))}</dd>
          <dt>상태</dt><dd>${ridePill(r.status)}</dd>
        </dl>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>닫기</button>
      </div>
    </div>
  `);
}

function cancelRide(id){
  const r = state.rides.find(x => x.id === id); if (!r) return;
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">합승 강제 취소 · ${r.id}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 10px; font-size:13px; color:var(--text-2)">취소 사유를 입력하세요. 참여자 전원에게 즉시 알림이 발송됩니다.</p>
        <textarea class="textarea" id="rc-reason" placeholder="예: 운영자 확인 결과 중복 매칭이 발견되어 취소 처리합니다."></textarea>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>돌아가기</button>
        <button class="btn btn-danger" id="rc-ok">취소 확정</button>
      </div>
    </div>
  `, (host) => {
    host.querySelector('#rc-ok').onclick = () => {
      r.status = '취소';
      save(LS.RIDES, state.rides);
      closeModal();
      renderRides(document.getElementById('content'));
      toast(`${r.id} 합승이 강제 취소되었습니다.`, 'warn');
    };
  });
}

/* ---------- REPORTS ---------- */
function renderReports(root){
  const f = state.filters.reports;
  let list = state.reports.slice();
  if (f.status) list = list.filter(r => r.status === f.status);

  root.innerHTML = `
    <div class="toolbar">
      <select class="tb-select" id="rp-status">
        <option value="">전체 상태</option>
        <option ${f.status==='접수'?'selected':''}>접수</option>
        <option ${f.status==='처리중'?'selected':''}>처리중</option>
        <option ${f.status==='완료'?'selected':''}>완료</option>
      </select>
      <div class="tb-spacer"></div>
      <span class="pill err">접수 ${state.reports.filter(r=>r.status==='접수').length}</span>
      <span class="pill warn">처리중 ${state.reports.filter(r=>r.status==='처리중').length}</span>
      <span class="pill ok">완료 ${state.reports.filter(r=>r.status==='완료').length}</span>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>신고 ID</th>
              <th>신고자</th>
              <th>피신고자</th>
              <th>유형</th>
              <th>합승 ID</th>
              <th>신고일</th>
              <th>상태</th>
              <th style="text-align:right">액션</th>
            </tr>
          </thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="8" class="empty-row">데이터가 없습니다.</td></tr>` :
              list.map(r => `
                <tr>
                  <td class="mono">${r.id}</td>
                  <td>${r.reporter}</td>
                  <td>${r.reported}</td>
                  <td><span class="pill purple">${r.type}</span></td>
                  <td class="mono">${r.rideId}</td>
                  <td>${r.createdAt}</td>
                  <td>${reportPill(r.status)}</td>
                  <td class="actions">
                    <div class="row-actions">
                      <button class="btn btn-outline btn-sm" data-rpv="${r.id}">상세</button>
                      ${r.status !== '완료' ? `<button class="btn btn-ok btn-sm" data-rpf="${r.id}">완료 처리</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  root.querySelector('#rp-status').onchange = e => { f.status = e.target.value; renderReports(root); };
  root.querySelectorAll('[data-rpv]').forEach(b => b.onclick = () => openReportDetail(b.dataset.rpv));
  root.querySelectorAll('[data-rpf]').forEach(b => b.onclick = () => finishReport(b.dataset.rpf));
}

function reportPill(s){
  return s==='접수' ? '<span class="pill err">접수</span>'
       : s==='처리중' ? '<span class="pill warn">처리중</span>'
       : '<span class="pill ok">완료</span>';
}

function openReportDetail(id){
  const r = state.reports.find(x => x.id === id); if (!r) return;
  openModal(`
    <div class="modal lg">
      <div class="modal-head">
        <h3 class="modal-title">신고 상세 · ${r.id}</h3>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-body">
        <div class="two-col">
          <div class="card" style="box-shadow:none">
            <div class="card-head"><h3 class="card-title">신고자 진술 · ${r.reporter}</h3></div>
            <div class="card-body">
              <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.6;">
                약속된 합승 시간에 피신고자가 나타나지 않아 다른 참여자들이 장시간 대기하였습니다.
                사전 연락도 없어 ${r.type} 으로 신고합니다.
              </p>
            </div>
          </div>
          <div class="card" style="box-shadow:none">
            <div class="card-head"><h3 class="card-title">피신고자 진술 · ${r.reported}</h3></div>
            <div class="card-body">
              <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.6;">
                당일 업무 일정 변경으로 부득이하게 참여가 어려워졌으나 앱 알림 지연으로 인해 연락이 늦었습니다.
                운영자의 조정을 요청드립니다.
              </p>
            </div>
          </div>
        </div>
        <dl class="info-grid" style="margin-top:18px">
          <dt>유형</dt><dd><span class="pill purple">${r.type}</span></dd>
          <dt>합승 ID</dt><dd class="mono">${r.rideId}</dd>
          <dt>신고일</dt><dd>${r.createdAt}</dd>
          <dt>처리 상태</dt><dd>${reportPill(r.status)}</dd>
        </dl>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-close>닫기</button>
        ${r.status !== '완료' ? `<button class="btn btn-ok" id="rp-finish">완료 처리</button>` : ''}
      </div>
    </div>
  `, (host) => {
    const ok = host.querySelector('#rp-finish');
    if (ok) ok.onclick = () => { closeModal(); finishReport(r.id); };
  });
}

function finishReport(id){
  const r = state.reports.find(x => x.id === id); if (!r) return;
  r.status = '완료';
  save(LS.REPORTS, state.reports);
  renderReports(document.getElementById('content'));
  toast(`${r.id} 신고 완료 처리됨`, 'ok');
}

/* ---------- ANALYTICS ---------- */
function renderAnalytics(root){
  _seed = 99;
  const months = ['11월','12월','1월','2월','3월','4월'];
  const signups = months.map((_,i) => 80 + sInt(30, 90) + i*12);
  const maxSign = Math.max(...signups);

  const hours = Array.from({length: 24}, (_,i) => {
    if (i >= 5 && i <= 9) return sInt(60, 100);
    if (i >= 15 && i <= 21) return sInt(50, 90);
    if (i >= 22 || i < 4) return sInt(10, 30);
    return sInt(20, 55);
  });

  const tops = [
    '강남구','서초구','송파구','마포구','용산구','영등포구','분당구','일산 동구','판교','수원'
  ].map(name => ({ name, value: sInt(40, 180) })).sort((a,b) => b.value - a.value);
  const maxTop = tops[0].value;

  const fares = [25800, 26400, 27100, 26900, 28200, 28800];
  const minF = Math.min(...fares), maxF = Math.max(...fares);

  root.innerHTML = `
    <div class="two-col" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">월별 신규 가입자 (최근 6개월)</h3>
          <span class="pill info">누적 +${signups.reduce((a,b)=>a+b,0)}</span>
        </div>
        <div class="card-body">
          ${renderLineChart(months, signups)}
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">시간대별 매칭 분포 (24h)</h3>
          <span class="pill muted">최근 30일 평균</span>
        </div>
        <div class="card-body">
          <div class="bar-chart" style="height:180px">
            ${hours.map((v,i) => `
              <div class="bar" style="height:${(v/100)*100}%">
                <span class="bar-val">${v}</span>
              </div>
            `).join('')}
          </div>
          <div class="bar-labels" style="grid-template-columns: repeat(24, 1fr)">
            ${hours.map((_,i) => `<span>${i}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-head">
          <h3 class="card-title">지역별 출발지 Top 10</h3>
        </div>
        <div class="card-body">
          <div class="hbar-chart">
            ${tops.map(t => `
              <div class="hbar-row">
                <div class="hbar-lbl">${t.name}</div>
                <div class="hbar-track"><div class="hbar-fill" style="width:${(t.value/maxTop)*100}%"></div></div>
                <div class="hbar-val">${t.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3 class="card-title">평균 합승 요금 추이 (최근 6개월)</h3>
          <span class="pill ok">+11.6%</span>
        </div>
        <div class="card-body">
          ${renderLineChart(months, fares, true)}
        </div>
      </div>
    </div>
  `;
}

function renderLineChart(labels, values, money=false){
  const W = 520, H = 200, PAD = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const xStep = (W - PAD*2) / (labels.length - 1);
  const pts = values.map((v,i) => {
    const x = PAD + i * xStep;
    const y = H - PAD - ((v - min) / range) * (H - PAD*2);
    return [x, y];
  });
  const path = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pts[pts.length-1][0]},${H-PAD} L ${pts[0][0]},${H-PAD} Z`;
  const fmt = money ? (v) => '₩'+(v/1000).toFixed(1)+'k' : (v) => v;

  return `
    <svg class="line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0.25,0.5,0.75].map(f => `<line x1="${PAD}" x2="${W-PAD}" y1="${PAD + f*(H-PAD*2)}" y2="${PAD + f*(H-PAD*2)}" stroke="#eef2f8"/>`).join('')}
      <path d="${area}" fill="url(#lg-area)"/>
      <path d="${path}" fill="none" stroke="#0a2540" stroke-width="2.2"/>
      ${pts.map((p,i) => `
        <g>
          <circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" stroke="#0a2540" stroke-width="2"/>
          <text x="${p[0]}" y="${p[1]-10}" text-anchor="middle" font-size="10" font-weight="700" fill="#0a2540">${fmt(values[i])}</text>
        </g>
      `).join('')}
      ${labels.map((l,i) => `<text x="${PAD + i*xStep}" y="${H-10}" text-anchor="middle" font-size="11" fill="#94a3b8">${l}</text>`).join('')}
    </svg>
  `;
}

/* ---------- SETTINGS ---------- */
function renderSettings(root){
  const s = state.settings;
  root.innerHTML = `
    <div class="settings-grid">
      <div class="card">
        <div class="card-head"><h3 class="card-title">운영 정책</h3></div>
        <div class="card-body">
          <div class="setting-row">
            <div class="s-info">
              <span class="s-label">수수료율 (%)</span>
              <span class="s-desc">합승 건당 플랫폼이 가져가는 비율입니다.</span>
            </div>
            <input class="tb-input" type="number" id="set-fee" value="${s.feeRate}" min="0" max="30" step="0.5" style="width:100px"/>
          </div>
          <div class="setting-row">
            <div class="s-info">
              <span class="s-label">재직 인증 자동 승인</span>
              <span class="s-desc">사내 도메인 이메일의 경우 검수 없이 자동 승인합니다.</span>
            </div>
            <button class="toggle ${s.autoApprove?'on':''}" id="set-auto"></button>
          </div>
          <div class="setting-row">
            <div class="s-info">
              <span class="s-label">저장</span>
              <span class="s-desc">변경 사항을 적용합니다.</span>
            </div>
            <button class="btn btn-primary" id="set-save">저장</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3 class="card-title">공지사항 작성</h3></div>
        <div class="card-body">
          <div class="field">
            <span class="field-label">공지 내용</span>
            <textarea class="textarea" id="set-notice" placeholder="전체 사용자에게 발송할 공지를 입력하세요.">${s.notice || ''}</textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
            <button class="btn btn-outline" id="set-notice-save">임시 저장</button>
            <button class="btn btn-sky" id="set-notice-send">전송</button>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1">
        <div class="card-head">
          <h3 class="card-title">관리자 계정</h3>
          <button class="btn btn-outline btn-sm" id="set-admin-add">+ 관리자 추가</button>
        </div>
        <div class="card-body">
          <div class="admin-list">
            ${s.admins.map((a,i) => `
              <div class="admin-row">
                <div class="avatar">${a.name[0]}</div>
                <div>
                  <div class="ar-name">${a.name}</div>
                  <div class="ar-email">${a.email}</div>
                </div>
                <div class="spacer"></div>
                <span class="pill info">${a.role}</span>
                <button class="btn btn-ghost btn-sm" data-admin-del="${i}">삭제</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#set-save').onclick = () => {
    s.feeRate = parseFloat(root.querySelector('#set-fee').value) || 0;
    save(LS.SETTINGS, s);
    toast('운영 정책 저장됨', 'ok');
  };
  root.querySelector('#set-auto').onclick = (e) => {
    s.autoApprove = !s.autoApprove;
    e.target.classList.toggle('on', s.autoApprove);
    save(LS.SETTINGS, s);
    toast(`자동 승인 ${s.autoApprove?'활성화':'비활성화'}됨`, 'ok');
  };
  root.querySelector('#set-notice-save').onclick = () => {
    s.notice = root.querySelector('#set-notice').value;
    save(LS.SETTINGS, s);
    toast('공지 임시 저장됨', 'ok');
  };
  root.querySelector('#set-notice-send').onclick = () => {
    const v = root.querySelector('#set-notice').value.trim();
    if (!v) return toast('공지 내용을 입력하세요.', 'err');
    confirmModal({
      title: '공지 전송',
      body: `<p style="margin:0; color:var(--text-2); font-size:13px;">전체 1,247명의 사용자에게 즉시 전송됩니다.</p>`,
      confirmLabel: '전송',
      onConfirm: () => toast('공지 전송 완료', 'ok'),
    });
  };
  root.querySelector('#set-admin-add').onclick = () => {
    openModal(`
      <div class="modal">
        <div class="modal-head">
          <h3 class="modal-title">관리자 추가</h3>
          <button class="modal-close" data-close>×</button>
        </div>
        <div class="modal-body">
          <div class="field"><span class="field-label">이름</span><input class="tb-input" id="na-name" placeholder="홍길동"/></div>
          <div class="field" style="margin-top:10px"><span class="field-label">이메일</span><input class="tb-input" id="na-email" placeholder="name@airpool.kr"/></div>
          <div class="field" style="margin-top:10px"><span class="field-label">권한</span>
            <select class="tb-select" id="na-role"><option>운영</option><option>CS</option><option>슈퍼 관리자</option></select>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" data-close>취소</button>
          <button class="btn btn-primary" id="na-ok">추가</button>
        </div>
      </div>
    `, (host) => {
      host.querySelector('#na-ok').onclick = () => {
        const name = host.querySelector('#na-name').value.trim();
        const email = host.querySelector('#na-email').value.trim();
        const role = host.querySelector('#na-role').value;
        if (!name || !email) return toast('이름과 이메일을 입력하세요.', 'err');
        s.admins.push({ name, email, role });
        save(LS.SETTINGS, s);
        closeModal();
        renderSettings(root);
        toast(`${name}님 추가됨`, 'ok');
      };
    });
  };
  root.querySelectorAll('[data-admin-del]').forEach(b => {
    b.onclick = () => {
      const i = parseInt(b.dataset.adminDel);
      const adm = s.admins[i];
      confirmModal({
        title: '관리자 삭제',
        body: `<p style="margin:0; font-size:13px; color:var(--text-2)"><strong>${adm.name}</strong>(${adm.email}) 관리자 계정을 삭제하시겠습니까?</p>`,
        confirmLabel: '삭제',
        danger: true,
        onConfirm: () => {
          s.admins.splice(i, 1);
          save(LS.SETTINGS, s);
          renderSettings(root);
          toast('관리자 삭제됨', 'warn');
        },
      });
    };
  });
}

/* ---------- GLOBAL WIRING ---------- */
function bindGlobals(){
  // sidebar nav
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      const s = a.dataset.section;
      location.hash = '#/' + s;
      setSection(s);
    };
  });

  // hash
  window.addEventListener('hashchange', () => {
    const s = location.hash.replace('#/','') || 'dashboard';
    setSection(s);
  });

  // profile dropdown
  const dd = document.getElementById('profile-dd');
  const menu = document.getElementById('profile-menu');
  dd.onclick = (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  };
  document.addEventListener('click', () => menu.classList.remove('open'));

  // logout
  document.getElementById('btn-logout').onclick = logout;
  document.getElementById('btn-logout-2').onclick = logout;

  // notify bell -> jump to verifications
  document.getElementById('btn-notify').onclick = () => {
    location.hash = '#/verifications';
  };

  // global search → jump to users if looks like person/empId, else rides
  const gs = document.getElementById('global-search');
  gs.onkeydown = (e) => {
    if (e.key === 'Enter'){
      const q = gs.value.trim();
      if (!q) return;
      if (/^R\d+/i.test(q)){
        state.filters.rides.q = q;
        location.hash = '#/rides';
      } else {
        state.filters.users.q = q;
        location.hash = '#/users';
      }
      gs.value = '';
    }
  };

  // login
  document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value;
    const err = document.getElementById('login-error');
    if (id === 'admin' && pw === 'admin1234'){
      localStorage.setItem(LS.AUTH, '1');
      err.classList.add('hidden');
      showApp();
      toast('환영합니다, admin님', 'ok');
    } else {
      err.classList.remove('hidden');
    }
  };

  // ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ---------- INIT ---------- */
function init(){
  bindGlobals();
  if (isLoggedIn()) showApp(); else showLogin();
}
init();
