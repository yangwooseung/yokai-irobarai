// 캐릭터 데이터(characters.json) 파라미터만으로 동작. 캐릭터별 분기 금지.
import { VIEW_W } from './util.js';
import { spriteFrame, drawSprite } from './sprites.js';

export function createPlayer(def, x, y, sprites) {
  return {
    def, sprites, x, y, w: def.w, h: def.h,
    anim: 'idle', animT: 0,
    vx: 0, vy: 0, onGround: false,
    hp: def.hp, inv: 0,
    coyote: 0, jumpBuf: 0, jumpHeld: false,
    shotT: 0,
    meleeT: 0, meleeCd: 0, meleeBuf: 0, meleeHits: new Set(),
  };
}

export function updatePlayer(p, input, G) {
  const d = p.def;

  // 좌우 이동 (화면 밖으로 못 나감)
  const dir = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
  p.vx = dir * d.speed;
  p.x += p.vx;
  p.x = Math.max(G.cam, Math.min(G.cam + VIEW_W - p.w, p.x));

  // 점프 (선입력 버퍼 + 코요테 타임 + 버튼 떼면 낮은 점프)
  p.jumpBuf = input.pressed('jump') ? d.inputBuffer : Math.max(0, p.jumpBuf - 1);
  p.coyote = p.onGround ? d.coyote : Math.max(0, p.coyote - 1);
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -d.jump;
    p.jumpBuf = 0;
    p.coyote = 0;
    p.onGround = false;
    p.jumpHeld = true;
  }
  if (p.jumpHeld && !input.down('jump')) {
    if (p.vy < 0) p.vy *= d.jumpCut;
    p.jumpHeld = false;
  }

  p.vy = Math.min(p.vy + d.gravity, d.maxFall);
  const prevBottom = p.y + p.h;
  p.y += p.vy;
  p.onGround = false;
  if (p.vy >= 0) {
    const bottom = p.y + p.h;
    const st = G.stage;
    if (bottom >= st.groundY) {
      land(p, st.groundY);
    } else {
      // 발판은 위에서만 착지 (아래에서 통과 가능)
      for (const pl of st.platforms) {
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && prevBottom <= pl.y && bottom >= pl.y) {
          land(p, pl.y);
          break;
        }
      }
    }
  }

  // 부적: 자동 연사
  const r = d.ranged;
  if (--p.shotT <= 0) {
    p.shotT = r.interval;
    G.shots.push({
      kind: 'ofuda', owner: 'player',
      x: p.x + p.w, y: p.y + r.muzzleY, w: r.w, h: r.h,
      vx: r.speed, vy: 0, power: r.power,
    });
  }

  // 봉
  const m = d.melee;
  p.meleeBuf = input.pressed('bo') ? d.inputBuffer : Math.max(0, p.meleeBuf - 1);
  if (p.meleeCd > 0) p.meleeCd--;
  if (p.meleeT > 0) p.meleeT--;
  if (p.meleeBuf > 0 && p.meleeCd <= 0) {
    p.meleeT = m.active;
    p.meleeCd = m.cooldown;
    p.meleeBuf = 0;
    p.meleeHits.clear();
  }

  if (p.inv > 0) p.inv--;

  let anim = 'idle';
  if (p.inv > d.invincible - 15) anim = 'hurt';
  else if (p.meleeT > 0) anim = 'swing';
  else if (!p.onGround) anim = 'jump';
  else if (dir !== 0) anim = 'run';
  if (anim !== p.anim) { p.anim = anim; p.animT = 0; }
  else p.animT++;
}

function land(p, y) {
  p.y = y - p.h;
  p.vy = 0;
  p.onGround = true;
}

export function meleeBox(p) {
  if (p.meleeT <= 0) return null;
  const m = p.def.melee;
  return { x: p.x + p.w - 2, y: p.y + p.h / 2 - m.height / 2, w: m.range, h: m.height };
}

export function hurtBox(p) {
  return { x: p.x + 2, y: p.y + 3, w: p.w - 4, h: p.h - 5 };
}

export function hurtPlayer(p) {
  if (p.inv > 0) return false;
  p.hp--;
  p.inv = p.def.invincible;
  if (p.hp <= 0) p.hp = p.def.hp; // 프로토타입: 게임오버 없이 회복
  return true;
}

const STICK = '#9a6a3a';
const PAPER = '#ffffff';

// 오하라이봉: 손에서 angle 방향으로 막대 + 끝에 종이 술
function drawGohei(ctx, hx, hy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.fillStyle = STICK;
  for (let i = 1; i <= 7; i++) ctx.fillRect(Math.round(hx + cos * i), Math.round(hy + sin * i), 1, 1);
  const tx = Math.round(hx + cos * 8);
  const ty = Math.round(hy + sin * 8);
  ctx.fillStyle = PAPER;
  ctx.fillRect(tx, ty - 1, 1, 3);
  ctx.fillRect(tx + 1, ty + 1, 1, 3);
  ctx.fillRect(tx - 1, ty + 1, 1, 2);
}

export function drawPlayer(ctx, p, cam) {
  if (p.inv > 0 && (p.inv >> 2) & 1) return; // 무적 중 깜빡임
  const set = p.sprites;
  const frame = spriteFrame(set, p.anim, p.animT);
  const o = drawSprite(ctx, set, frame, p.x - cam + p.w / 2, p.y + p.h);
  const hx = o.left + frame.hand[0];
  const hy = o.top + frame.hand[1];

  if (p.meleeT <= 0) {
    drawGohei(ctx, hx, hy, -Math.PI * 0.3);
    return;
  }
  // 휘두르기: 위(-100°)에서 아래(+50°)로 쓸어내리는 궤적
  const q = 1 - p.meleeT / p.def.melee.active;
  const a0 = -Math.PI * 0.55;
  const a1 = a0 + (Math.PI * 0.85) * Math.min(1, q * 1.6);
  const rad = p.def.melee.range * 0.6;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let a = a0; a <= a1; a += 0.08) {
    ctx.fillRect(Math.round(hx + Math.cos(a) * rad), Math.round(hy + Math.sin(a) * rad), 2, 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  for (let a = a0; a <= a1; a += 0.1) {
    ctx.fillRect(Math.round(hx + Math.cos(a) * (rad - 3)), Math.round(hy + Math.sin(a) * (rad - 3)), 1, 1);
  }
  drawGohei(ctx, hx, hy, a1);
}
