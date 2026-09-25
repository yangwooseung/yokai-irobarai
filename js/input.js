// 터치 버튼 + 키보드(디버그) 입력
// 포인터 ID별로 어느 버튼을 누르고 있는지 관리 → 멀티터치 동시 입력, 버튼 사이 손가락 슬라이드 가능

const KEYMAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyZ: 'jump',
  ArrowUp: 'jump',
  Space: 'jump',
  KeyX: 'bo',
};
const HIT_MARGIN = 6; // 버튼 바깥쪽 여유 판정(px)

export function createInput(root) {
  const els = [...root.querySelectorAll('[data-btn]')];
  const names = [...new Set(els.map(el => el.dataset.btn))];
  const state = {};
  for (const n of names) state[n] = { down: false, latch: false };
  const keys = {};
  const pointers = new Map();

  function hitTest(x, y) {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - HIT_MARGIN && x <= r.right + HIT_MARGIN &&
          y >= r.top - HIT_MARGIN && y <= r.bottom + HIT_MARGIN) return el.dataset.btn;
    }
    return null;
  }

  function refresh() {
    const held = new Set(pointers.values());
    for (const n of names) {
      const down = !!keys[n] || held.has(n);
      // 프레임 사이의 짧은 탭도 놓치지 않도록 눌림을 래치해 둔다
      if (down && !state[n].down) state[n].latch = true;
      state[n].down = down;
    }
    for (const el of els) el.classList.toggle('on', state[el.dataset.btn].down);
  }

  window.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, hitTest(e.clientX, e.clientY));
    refresh();
  });
  window.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, hitTest(e.clientX, e.clientY));
    refresh();
  });
  const release = e => { pointers.delete(e.pointerId); refresh(); };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  window.addEventListener('keydown', e => {
    const n = KEYMAP[e.code];
    if (!n) return;
    e.preventDefault();
    keys[n] = true;
    refresh();
  });
  window.addEventListener('keyup', e => {
    const n = KEYMAP[e.code];
    if (!n) return;
    keys[n] = false;
    refresh();
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    pointers.clear();
    refresh();
  });

  // iOS Safari 스크롤·핀치 확대 방지
  const block = e => e.preventDefault();
  document.addEventListener('touchstart', block, { passive: false });
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('gesturestart', block);
  document.addEventListener('contextmenu', block);

  return {
    down: n => state[n].down,
    pressed: n => state[n].latch,
    endStep() { for (const n of names) state[n].latch = false; },
  };
}
