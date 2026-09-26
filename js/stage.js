// 자동 스크롤, 발판 배치, 적 스폰. 수치는 stages.json
import { VIEW_W } from './util.js';
import { createEnemy } from './enemy.js';
import { createBackground, drawBackground } from './background.js';

export function createStage(def) {
  return {
    def, groundY: def.groundY, platforms: [], nextSeg: 0, spawnT: def.spawn.first,
    bg: createBackground(def.theme, def.groundY),
  };
}

export function updateStage(st, G) {
  const d = st.def;
  G.cam += d.scrollSpeed;

  // 발판 패턴을 segment 간격으로 반복 배치
  while (st.nextSeg < G.cam + VIEW_W + 64) {
    for (const p of d.platforms) st.platforms.push({ x: st.nextSeg + p.x, y: p.y, w: p.w });
    st.nextSeg += d.segment;
  }
  st.platforms = st.platforms.filter(p => p.x + p.w > G.cam - 8);

  const sp = d.spawn;
  if (--st.spawnT <= 0) {
    st.spawnT = sp.interval;
    const y = sp.ys[Math.floor(Math.random() * sp.ys.length)];
    G.enemies.push(createEnemy(G.data.yokai[sp.enemy], G.sprites.yokai[sp.enemy], G.cam + VIEW_W + 2, y));
  }
}

export function drawStage(ctx, st, cam) {
  const th = st.def.theme;
  drawBackground(ctx, st.bg, cam, st.groundY);

  // 발판: 나무 판자
  for (const p of st.platforms) {
    const x = Math.round(p.x - cam);
    ctx.fillStyle = th.plankShade;
    ctx.fillRect(x, p.y, p.w, 6);
    ctx.fillStyle = th.plank;
    ctx.fillRect(x + 1, p.y, p.w - 2, 4);
    ctx.fillStyle = th.plankLight;
    ctx.fillRect(x + 1, p.y, p.w - 2, 1);
    ctx.fillStyle = th.plankShade;
    for (let i = 12; i < p.w - 4; i += 12) ctx.fillRect(x + i, p.y + 1, 1, 3);
    ctx.fillRect(x + 3, p.y + 6, 2, 3); // 받침 그림자
    ctx.fillRect(x + p.w - 5, p.y + 6, 2, 3);
  }
}
