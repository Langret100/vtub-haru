// game-ghost.js - 게임 이벤트를 부모 창 Live2D로 전달하는 브릿지
// 캐릭터/말풍선은 부모 창(game-emotion.js + live2d-emotion.js)에서 처리
(function () {
  if (window.gameGhostUI) return;

  var hideTimer = null;

  function react(eventType) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    // game-emotion.js REACTIONS 키로 매핑
    var mapped = { correct: "good", wrong: "miss", fail: "gameover" };
    var mappedType = mapped[eventType] || eventType;

    // 부모 창 Live2D로 감정 이벤트 전달
    try {
      var target = (window.parent !== window) ? window.parent : (window.opener || null);
      if (target) {
        target.postMessage({ type: "GAME_REACT", eventType: mappedType }, "*");
      }
    } catch(e) {}
  }

  window.gameGhostUI = {
    react: react,
    // 하위 호환: 기존 게임 코드에서 호출하는 메서드들 빈 함수로 유지
    show: function() {},
    hide: function() {},
    setEmotion: function() {}
  };
})();
