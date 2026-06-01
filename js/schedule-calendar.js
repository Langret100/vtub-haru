// schedule-calendar.js v3

(function () {
  const STORAGE_KEY = "broadcastSchedule";

  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch(e) { return {}; }
  }
  function saveData(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch(e) {}
  }
  function dateKey(y, m, d) {
    return y + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
  }

  // ── 스타일 ────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("sc-style")) return;
    const s = document.createElement("style");
    s.id = "sc-style";
    s.textContent = `
      /* 아이콘 버튼 */
      #scBtn {
        position: absolute;
        top: 14px; right: 14px;
        width: 40px; height: 40px;
        border-radius: 12px;
        background: rgba(40,130,200,0.28);
        border: 1px solid rgba(160,230,255,0.45);
        backdrop-filter: blur(14px);
        cursor: pointer; z-index: 15;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; color: rgba(210,245,255,0.9);
        transition: background .2s, transform .2s;
        box-shadow: 0 2px 12px rgba(0,80,180,.2);
      }
      #scBtn:hover { background: rgba(60,160,240,.42); transform: scale(1.08); }

      /* 달력 본체 */
      #scCal {
        position: absolute;
        top: 50%; left: 50%;
        width: min(700px, 93vw);
        background: rgba(8,44,78,0.26);
        backdrop-filter: blur(38px) saturate(1.5);
        -webkit-backdrop-filter: blur(38px) saturate(1.5);
        border: 1px solid rgba(160,230,255,0.20);
        border-radius: 26px;
        box-shadow: 0 30px 80px rgba(0,40,120,.3), inset 0 1px 0 rgba(200,240,255,.15);
        padding: 24px 22px 20px;
        color: rgba(220,245,255,.95);
        font-family: inherit;
        z-index: 50;
        /* 열린 상태 */
        transform: translate(-50%,-50%) scale(1);
        opacity: 1;
        pointer-events: auto;
        transition: transform .36s cubic-bezier(.34,1.26,.64,1), opacity .28s ease;
      }
      /* 닫힌 상태: 우측 상단 아이콘 방향으로 축소 */
      #scCal.sc-off {
        transform: translate(calc(-50% + 50vw - 54px), calc(-50% - 50vh + 54px)) scale(0.05);
        opacity: 0;
        pointer-events: none;
      }

      /* PC 방송방: 항상 열림, 아이콘 버튼 숨김 */
      body.broadcast-room-mode #scBtn { display: none; }
      body.broadcast-room-mode #scCal { pointer-events: auto !important; opacity: 1 !important;
        transform: translate(-50%,-50%) scale(1) !important; }
      body.broadcast-room-mode #scCal.sc-off { pointer-events: auto !important; opacity: 1 !important;
        transform: translate(-50%,-50%) scale(1) !important; }

      @media (max-width:768px) {
        body.broadcast-room-mode #scBtn { display: flex; }
        #scCal { width: min(370px,96vw); padding: 16px 12px 14px; }
      }

      /* 헤더 */
      .sc-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
      .sc-title { font-size:18px; font-weight:700; letter-spacing:.05em;
        text-shadow: 0 0 18px rgba(120,210,255,.4); }
      .sc-navg { display:flex; gap:6px; }
      .sc-nav, .sc-x {
        width:30px; height:30px; border-radius:9px; font-size:15px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition: background .15s, transform .12s; border:1px solid;
      }
      .sc-nav { background:rgba(50,150,220,.22); border-color:rgba(140,220,255,.28); color:rgba(200,240,255,.9); }
      .sc-nav:hover { background:rgba(70,180,255,.38); transform:scale(1.08); }
      .sc-x { background:rgba(200,50,50,.2); border-color:rgba(255,140,140,.3); color:rgba(255,190,190,.85); }
      .sc-x:hover { background:rgba(255,70,70,.38); transform:scale(1.08); }

      /* 요일 행 */
      .sc-wds { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:4px; }
      .sc-wd { text-align:center; font-size:11px; font-weight:700; padding:2px 0;
        color:rgba(160,220,255,.5); letter-spacing:.04em; }
      .wd-sun { color:rgba(255,165,165,.65); }
      .wd-sat { color:rgba(170,190,255,.65); }

      /* 날짜 그리드 */
      .sc-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; position:relative; }
      .sc-cell {
        min-height:64px; border-radius:11px;
        background:rgba(20,80,140,.16); border:1px solid rgba(100,200,255,.09);
        padding:5px 6px; cursor:pointer; position:relative;
        transition: background .16s, border-color .16s;
        overflow:hidden;
      }
      .sc-cell:hover:not(.sc-mt) { background:rgba(40,120,200,.30); border-color:rgba(140,220,255,.26); }
      .sc-cell.sc-today { background:rgba(30,110,200,.32); border-color:rgba(160,230,255,.48);
        box-shadow: inset 0 0 0 1px rgba(160,230,255,.22); }
      .sc-cell.sc-mt { background:transparent; border-color:transparent; cursor:default; pointer-events:none; }
      .sc-cell.sc-om .sc-dn { opacity:.25; }

      .sc-dn { font-size:12px; font-weight:700; color:rgba(200,240,255,.85); display:block;
        margin-bottom:2px; line-height:1; }
      .sc-cell.sc-sun .sc-dn { color:rgba(255,170,170,.85); }
      .sc-cell.sc-sat .sc-dn { color:rgba(180,200,255,.85); }
      .sc-preview { font-size:9px; color:rgba(180,230,255,.6); line-height:1.3;
        overflow:hidden; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical;
        word-break:break-all; white-space:pre-wrap; }

      /* 확장 패널 — 달력 위에 absolute로 같은 스타일 */
      #scExpand {
        position: absolute;
        width: 220px;
        background: rgba(8,44,78,0.72);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border: 1px solid rgba(160,230,255,.40);
        border-radius: 14px;
        box-shadow: 0 16px 48px rgba(0,50,140,.45), inset 0 1px 0 rgba(200,240,255,.12);
        padding: 12px 13px 48px;
        z-index: 100;
        animation: scPop .18s cubic-bezier(.34,1.3,.64,1);
      }
      @keyframes scPop {
        from { transform: scale(.88); opacity:0; }
        to   { transform: scale(1);   opacity:1; }
      }
      #scExpand .sc-dn {
        font-size: 14px;
        color: rgba(210,245,255,.9);
        margin-bottom: 8px;
      }
      #scExpand textarea {
        width: 100%; min-height: 90px;
        background: rgba(5,28,60,.5);
        border: 1px solid rgba(120,210,255,.32);
        border-radius: 9px;
        color: rgba(220,245,255,.95);
        font-size: 13px; line-height: 1.5;
        padding: 7px 9px; resize: none; outline: none;
        box-sizing: border-box; font-family: inherit;
        display: block;
      }
      #scExpand textarea::placeholder { color:rgba(140,200,240,.38); }
      #scExpand textarea:focus { border-color:rgba(160,230,255,.55); }
      #scExpand .sc-acts {
        position: absolute; bottom: 10px; right: 10px; left: 10px;
        display: flex; justify-content: flex-end; gap: 6px;
      }
      #scExpand .sc-save, #scExpand .sc-del {
        height: 26px; border-radius: 7px; font-size: 11px; cursor: pointer;
        display: flex; align-items: center; padding: 0 10px; gap: 4px;
        border: 1px solid; transition: background .15s;
      }
      #scExpand .sc-save { background:rgba(40,150,220,.35); border-color:rgba(140,220,255,.4); color:rgba(200,240,255,.9); }
      #scExpand .sc-save:hover { background:rgba(60,180,255,.52); }
      #scExpand .sc-del  { background:rgba(180,40,40,.22); border-color:rgba(255,130,130,.32); color:rgba(255,180,180,.85); }
      #scExpand .sc-del:hover  { background:rgba(255,60,60,.42); }

      /* 확장 패널 뒤 클릭 차단 오버레이 (달력 안) */
      #scExpandBg {
        position: absolute; inset: 0; z-index: 99; cursor: default;
      }
    `;
    document.head.appendChild(s);
  }

  // ── 상태 ──────────────────────────────────────────────────────
  let cy, cm, expandKey = null;

  function calEl()    { return document.getElementById("scCal"); }
  function gridEl()   { return document.getElementById("scGrid"); }
  function expandEl() { return document.getElementById("scExpand"); }

  // ── 달력 렌더 ─────────────────────────────────────────────────
  function render() {
    const cal = calEl(); if (!cal) return;
    closeExpand(true);
    const data = loadData();
    const now = new Date();
    const fd = new Date(cy, cm, 1).getDay();
    const dim = new Date(cy, cm+1, 0).getDate();
    const dip = new Date(cy, cm, 0).getDate();
    const MN = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
    const WD = [["일","wd-sun"],["월",""],["화",""],["수",""],["목",""],["금",""],["토","wd-sat"]];

    let h = `
      <div class="sc-hd">
        <button class="sc-nav" id="scPrev">&#8249;</button>
        <span class="sc-title">${cy}년 ${MN[cm]}</span>
        <div class="sc-navg">
          <button class="sc-nav" id="scNext">&#8250;</button>
          <button class="sc-x"  id="scX">✕</button>
        </div>
      </div>
      <div class="sc-wds">${WD.map(([w,c])=>`<div class="sc-wd ${c}">${w}</div>`).join("")}</div>
      <div class="sc-grid" id="scGrid">`;

    for (let i=0;i<fd;i++) {
      h += `<div class="sc-cell sc-mt sc-om"><span class="sc-dn">${dip-fd+1+i}</span></div>`;
    }
    for (let d=1;d<=dim;d++) {
      const key=dateKey(cy,cm,d);
      const today=d===now.getDate()&&cm===now.getMonth()&&cy===now.getFullYear();
      const dow=new Date(cy,cm,d).getDay();
      const note=data[key]||"";
      h += `<div class="sc-cell${today?" sc-today":""}${dow===0?" sc-sun":""}${dow===6?" sc-sat":""}" data-key="${key}">
        <span class="sc-dn">${d}</span>
        ${note?`<div class="sc-preview">${note.replace(/</g,"&lt;")}</div>`:""}
      </div>`;
    }
    const rem=(fd+dim)%7; const fill=rem?7-rem:0;
    for (let i=1;i<=fill;i++) {
      h += `<div class="sc-cell sc-mt sc-om"><span class="sc-dn">${i}</span></div>`;
    }
    h += `</div>`;
    cal.innerHTML = h;

    document.getElementById("scPrev").onclick = e => { e.stopPropagation(); cy===0?(cy--,cm=11):(cm===0?(cy--,cm=11):cm--); if(cy<1){cy=new Date().getFullYear()-1;} cm<0&&(cm=11,cy--); cm>11&&(cm=0,cy++); render(); };
    // 단순하게
    document.getElementById("scPrev").onclick = e => { e.stopPropagation(); cm--; if(cm<0){cm=11;cy--;} render(); };
    document.getElementById("scNext").onclick = e => { e.stopPropagation(); cm++; if(cm>11){cm=0;cy++;} render(); };
    document.getElementById("scX").onclick    = e => { e.stopPropagation(); closeCal(); };

    document.getElementById("scGrid").querySelectorAll(".sc-cell:not(.sc-mt)").forEach(cell => {
      cell.addEventListener("click", e => {
        e.stopPropagation();
        const key = cell.dataset.key;
        if (expandKey === key) { closeExpand(); return; }
        openExpand(cell, key);
      });
    });
  }

  // ── 확장 패널 ─────────────────────────────────────────────────
  function openExpand(cellEl, key) {
    closeExpand(true);
    expandKey = key;
    const data = loadData();
    const note = data[key] || "";

    // 셀의 그리드 내 상대 위치
    const grid = gridEl();
    const gcr  = grid.getBoundingClientRect();
    const ccr  = cellEl.getBoundingClientRect();
    const cal  = calEl();
    const calcr= cal.getBoundingClientRect();

    // 확장 패널 좌표 (cal 기준 absolute)
    const panW = 220, panH = 175;
    let left = (ccr.left - calcr.left) + ccr.width + 4;
    let top  = (ccr.top  - calcr.top);
    // 오른쪽 공간 부족하면 왼쪽에
    if (left + panW > cal.offsetWidth - 8) left = (ccr.left - calcr.left) - panW - 4;
    if (left < 4) left = 4;
    // 아래 공간 부족하면 위로
    if (top + panH > cal.offsetHeight - 8) top = cal.offsetHeight - panH - 8;
    if (top < 4) top = 4;

    // 클릭 차단 배경
    const bg = document.createElement("div");
    bg.id = "scExpandBg";
    bg.onclick = e => { e.stopPropagation(); closeExpand(); };
    cal.appendChild(bg);

    // 패널 생성
    const panel = document.createElement("div");
    panel.id = "scExpand";
    panel.style.left = left + "px";
    panel.style.top  = top  + "px";
    panel.innerHTML = `
      <span class="sc-dn">${key.replace(/^\d+-(\d+)-(\d+)$/,(_,mo,d)=>parseInt(mo)+"월 "+parseInt(d)+"일")}</span>
      <textarea placeholder="일정을 입력하세요...">${note}</textarea>
      <div class="sc-acts">
        ${note?`<button class="sc-del">🗑 삭제</button>`:""}
        <button class="sc-save">✓ 저장</button>
      </div>`;

    panel.querySelector("textarea").addEventListener("click", e => e.stopPropagation());
    panel.querySelector("textarea").addEventListener("keydown", e => e.stopPropagation());
    panel.querySelector(".sc-save").onclick = e => {
      e.stopPropagation();
      const val = panel.querySelector("textarea").value.trim();
      const d2 = loadData();
      if (val) d2[key]=val; else delete d2[key];
      saveData(d2);
      closeExpand(); render();
    };
    const delBtn = panel.querySelector(".sc-del");
    if (delBtn) delBtn.onclick = e => {
      e.stopPropagation();
      const d2=loadData(); delete d2[key]; saveData(d2);
      closeExpand(); render();
    };
    cal.appendChild(panel);
    setTimeout(() => panel.querySelector("textarea").focus(), 30);
  }

  function closeExpand(silent) {
    const p = expandEl();
    if (p) {
      if (silent) {
        const ta = p.querySelector("textarea");
        if (ta && expandKey) {
          const val = ta.value.trim();
          const d2 = loadData();
          if (val) d2[expandKey]=val; else delete d2[expandKey];
          saveData(d2);
        }
      }
      p.remove();
    }
    const bg = document.getElementById("scExpandBg");
    if (bg) bg.remove();
    expandKey = null;
  }

  // ── 달력 열기/닫기 ────────────────────────────────────────────
  function openCal() {
    const cal = calEl(); if (!cal) return;
    cal.classList.remove("sc-off");
  }
  function closeCal() {
    const isMob = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&window.innerWidth<900);
    if (document.body.classList.contains("broadcast-room-mode") && !isMob) return;
    closeExpand(true);
    const cal = calEl(); if (!cal) return;
    cal.classList.add("sc-off");
  }

  // ── 초기화 ────────────────────────────────────────────────────
  function init() {
    injectStyles();
    const now = new Date();
    cy = now.getFullYear(); cm = now.getMonth();
    const cw = document.getElementById("canvasWrapper"); if (!cw) return;

    if (!document.getElementById("scCal")) {
      const cal = document.createElement("div");
      cal.id = "scCal"; cal.className = "sc-off";
      cw.appendChild(cal);
    }
    render();

    if (!document.getElementById("scBtn")) {
      const btn = document.createElement("button");
      btn.id = "scBtn"; btn.innerHTML = "📅"; btn.title = "스케줄";
      btn.onclick = () => calEl().classList.contains("sc-off") ? openCal() : closeCal();
      cw.appendChild(btn);
    }

    window.addEventListener("ghost:broadcast-mode-changed", e => {
      const isMob = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&window.innerWidth<900);
      if (e.detail && e.detail.active && !isMob) openCal();
      else if (!e.detail || !e.detail.active) { const c=calEl(); if(c) c.classList.add("sc-off"); }
    });
  }

  if (document.readyState==="complete"||document.readyState==="interactive") setTimeout(init,120);
  else window.addEventListener("DOMContentLoaded",()=>setTimeout(init,120));

  window.ScheduleCalendar = { open:openCal, close:closeCal, rebuild:render };
})();
