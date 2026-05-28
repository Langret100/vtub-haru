// game-ghost.js v5 - Live2D 연동 (말풍선은 iframe 내부, 캐릭터는 부모 창 Live2D)
(function () {
  if (window.gameGhostUI) return;

  const LINES = {
    start: [
      "좋아, 한 번 제대로 놀아보자!",
      "준비 완료! 시작해 볼까?",
      "집중~ 이번 판은 꼭 해보자!",
      "파이팅! 내가 옆에서 지켜보고 있을게.",
      "천천히 해도 괜찮아. 우리 같이 해보자."
    ],
    correct: [
      "와, 정답이야! 완전 멋진데?",
      "맞췄다! 이런 감각이라면 금방 끝내겠는걸?",
      "굿! 지금 흐름 아주 좋아!",
      "정답! 방금 그 느낌 기억해 둬!",
      "오 훌륭해, 이번 판 에이스다!",
      "이 속도면 최고 기록도 노려보겠다!",
      "방금 그 선택, 완전 프로 감각인데?",
      "멋지다! 한 문제씩 확실히 쌓여 가고 있어.",
      "이렇게만 계속 가면 금방 마스터 하겠는걸?",
      "좋았어! 지금 리듬 그대로 이어가보자."
    ],
    miss: [
      "괜찮아, 한 번 더 해봐!",
      "어디가 헷갈렸는지 같이 봐볼까?",
      "실수도 연습의 일부야.",
      "다음엔 꼭 맞출 수 있어!"
    ],
    gameover: [
      "아쉽지만 다음에 더 잘할 수 있어.",
      "실패해도 괜찮아. 다시 하면 되지!",
      "이번 판은 여기까지! 한 번 더 도전해 볼까?",
      "에이, 이 정도면 워밍업이지 뭐.",
      "괜찮아. 나도 옆에서 다시 도와줄게."
    ]
  };

  // 이벤트 타입 → game-emotion.js REACTIONS 키 직접 매핑
  const EMOTION_REMAP = {
    start:    "start",
    correct:  "good",
    miss:     "miss",
    gameover: "gameover",
    exit:     "exit"
  };

  let bubbleEl = null;
  let hideTimer = null;

  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function ensureDom() {
    if (bubbleEl) return;
    const d = document;
    const style = d.createElement("style");
    style.textContent = `
      .game-ghost-bubble {
        position: fixed;
        right: 8px;
        bottom: 0;
        max-width: min(190px, 48vw);
        padding: 8px 12px;
        border-radius: 14px 14px 4px 14px;
        background: rgba(255,255,255,0.97);
        box-shadow: 0 3px 12px rgba(0,0,0,0.22);
        font-size: 0.80rem;
        line-height: 1.45;
        text-align: left;
        color: #222;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        pointer-events: none;
        z-index: 10002;
        box-sizing: border-box;
        word-break: keep-all;
        overflow-wrap: break-word;
      }
      @media (max-width: 768px) {
        .game-ghost-bubble {
          right: 4px;
          max-width: min(150px, 40vw);
          padding: 6px 9px;
          font-size: 0.72rem;
          line-height: 1.4;
        }
      }
      .game-ghost-bubble::after {
        content: '';
        position: absolute;
        right: 14px;
        bottom: -8px;
        border: 8px solid transparent;
        border-top-color: rgba(255,255,255,0.97);
        border-bottom: none;
      }
      .game-ghost-bubble.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    d.head.appendChild(style);
    bubbleEl = d.createElement("div");
    bubbleEl.className = "game-ghost-bubble";
    d.body.appendChild(bubbleEl);
  }

  function calcBubblePos() {
    var isMob = window.innerWidth <= 768;
    var charW, charH, bubbleBottom, bubbleRight;
    if (isMob) {
      charW = Math.min(140, Math.max(85,  Math.round(window.innerWidth  * 0.28)));
      charH = Math.min(220, Math.max(140, Math.round(window.innerHeight * 0.26)));
      bubbleRight  = Math.round(charW * 0.05) + "px";  // 모바일: 캐릭터 안쪽
      bubbleBottom = Math.round(charH * 0.95) + "px";
    } else {
      charW = Math.min(200, Math.max(120, Math.round(window.innerWidth  * 0.14)));
      charH = Math.min(300, Math.max(200, Math.round(window.innerHeight * 0.32)));
      // PC: 말풍선 우측 끝이 캐릭터 우측 끝과 맞도록
      bubbleRight  = Math.round(charW * 0.04) + "px";
      bubbleBottom = Math.round(charH * 0.95) + "px";
    }
    return { bottom: bubbleBottom, right: bubbleRight };
  }

  function showBubble(text) {
    if (!bubbleEl) return;
    if (text) {
      bubbleEl.textContent = text;
      var pos = calcBubblePos();
      bubbleEl.style.bottom = pos.bottom;
      bubbleEl.style.right  = pos.right;
      bubbleEl.classList.add("visible");
    } else {
      bubbleEl.textContent = "";
      bubbleEl.classList.remove("visible");
    }
  }

  function react(eventType) {
    ensureDom();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    const line = choice(LINES[eventType] || [""]);
    // 말풍선은 iframe 안에 표시 (캐릭터 바로 위)
    showBubble(line);

    // 부모 창 Live2D로 감정 전달 (game-emotion.js REACTIONS 키로 직접 매핑)
    var parentType = EMOTION_REMAP[eventType] || eventType;
    try {
      var target = (window.parent !== window) ? window.parent : (window.opener || null);
      if (target) target.postMessage({ type: "GAME_REACT", eventType: parentType }, "*");
    } catch(e) {}

    hideTimer = setTimeout(function() { showBubble(""); }, 5000);
  }

  window.gameGhostUI = { react: react };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureDom);
  } else {
    ensureDom();
  }
})();
