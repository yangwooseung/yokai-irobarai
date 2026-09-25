// 자동 스크롤, 발판 배치, 적 스폰. 수치는 stages.json
import { VIEW_W } from './util.js';
import { createEnemy } from './enemy.js';

export function createStage(def) {
  return { def, groundY: def.groundY, platforms: [], nextSeg: 0, spawnT: def.spawn.first };
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
    G.enemies.push(createEnemy(G.data.yokai[sp.enemy], G.cam + VIEW_W + 2, y));
  }
}

export function drawStage(ctx, st, cam) {
  const d = st.def;
  ctx.fillStyle = d.bg;
  ctx.fillRect(0, 0, VIEW_W, 180);

  // 원경 기둥 (스크롤 체감용 패럴랙스)
  ctx.fillStyle = '#44435a';
  for (let x = -((cam * 0.5) % 48); x < VIEW_W; x += 48) ctx.fillRect(Math.round(x), 30, 6, st.groundY - 30);

  // 지면
  ctx.fillStyle = '#4b4a3f';
  ctx.fillRect(0, st.groundY, VIEW_W, 180 - st.groundY);
  ctx.fillStyle = '#6a6857';
  ctx.fillRect(0, st.groundY, VIEW_W, 2);
  for (let wx = Math.floor(cam / 16) * 16; wx < cam + VIEW_W; wx += 16) ctx.fillRect(Math.round(wx - cam), st.groundY + 6, 2, 2);

  // 발판
  for (const p of st.platforms) {
    const x = Math.round(p.x - cam);
    ctx.fillStyle = '#6b5a45';
    ctx.fillRect(x, p.y, p.w, 6);
    ctx.fillStyle = '#8c7659';
    ctx.fillRect(x, p.y, p.w, 1);
  }
}
