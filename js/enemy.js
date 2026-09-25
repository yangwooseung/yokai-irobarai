// 요괴 행동. 수치는 yokai.json
import { VIEW_W } from './util.js';

export function createEnemy(def, x, y) {
  return { def, x, y, baseY: y, w: def.w, h: def.h, hp: def.hp, t: 0, shootT: def.shootDelay, flash: 0, dead: false };
}

export function updateEnemy(e, G) {
  const d = e.def;
  e.t++;
  e.x -= d.speed;
  if (d.bob && e.baseY + e.h < G.stage.groundY - 1) e.y = e.baseY + Math.sin(e.t * 0.05) * d.bob;
  if (e.flash > 0) e.flash--;

  const onScreen = e.x > G.cam && e.x + e.w < G.cam + VIEW_W;
  if (onScreen && --e.shootT <= 0) {
    e.shootT = d.shootInterval;
    shoot(e, G);
  }
  if (e.x + e.w < G.cam - 8) e.dead = true;
}

function shoot(e, G) {
  const d = e.def;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  let vx = -d.bulletSpeed;
  let vy = 0;
  const p = G.player;
  const dx = p.x + p.w / 2 - cx;
  const dy = p.y + p.h / 2 - cy;
  if (d.aim && dx < 0) {
    const n = Math.hypot(dx, dy);
    vx = dx / n * d.bulletSpeed;
    vy = dy / n * d.bulletSpeed;
  }
  G.shots.push({ kind: 'orb', owner: 'enemy', x: cx, y: cy, r: d.bulletR, vx, vy, power: 1 });
}

export function drawEnemy(ctx, e, cam) {
  const x = Math.round(e.x - cam);
  const y = Math.round(e.y);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.def.fogColor;
  ctx.fillRect(x, y, e.w, e.h);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; // 안개 테두리
  ctx.fillRect(x, y + e.h - 3, e.w, 3);
  ctx.fillStyle = '#1b1b22'; // 눈
  ctx.fillRect(x + 3, y + 5, 3, 3);
}
