// game-ghost.js v5 - Live2D 연동 (말풍선은 iframe 내부, 캐릭터는 부모 창 Live2D)
(function () {
  if (window.gameGhostUI) return;

  const EMOTION_POOL = {
    start:    ["cheer","listen","greet"],
    correct:  ["joy","fun","cheer","greet"],
    gameover: ["fail","sad","shy"]
  };

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
    gameover: [
      "아쉽지만 다음에 더 잘할 수 있어.",
      "실패해도 괜찮아. 다시 하면 되지!",
      "이번 판은 여기까지! 한 번 더 도전해 볼까?",
      "에이, 이 정도면 워밍업이지 뭐.",
      "괜찮아. 나도 옆에서 다시 도와줄게."
    ]
  };

  // 감정 키 → 부모 game-emotion.js REACTIONS 키 매핑
  const EMOTION_REMAP = {
    cheer: "start", listen: "start", greet: "start",
    joy: "good", fun: "good",
    fail: "gameover", sad: "gameover", shy: "gameover"
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
        bottom: 16px;
        max-width: min(220px, 55vw);
        padding: 8px 12px;
        border-radius: 16px;
        background: rgba(255,255,255,0.95);
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        font-size: 0.85rem;
        line-height: 1.4;
        text-align: center;
        color: #333;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.18s ease-out, transform 0.18s ease-out;
        pointer-events: none;
        z-index: 9999;
        box-sizing: border-box;
        word-break: keep-all;
        overflow-wrap: break-word;
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

  function showBubble(text) {
    if (!bubbleEl) return;
    if (text) {
      bubbleEl.textContent = text;
      bubbleEl.classList.add("visible");
    } else {
      bubbleEl.textContent = "";
      bubbleEl.classList.remove("visible");
    }
  }

  function react(eventType) {
    ensureDom();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    const pool = EMOTION_POOL[eventType] || ["idle"];
    const emoKey = choice(pool);
    const line = choice(LINES[eventType] || [""]);

    // 말풍선은 iframe 안에 표시
    showBubble(line);

    // 부모 창 Live2D로 감정 전달
    var parentType = EMOTION_REMAP[emoKey] || eventType;
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
