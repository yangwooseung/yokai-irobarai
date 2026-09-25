// 캐릭터 데이터(characters.json) 파라미터만으로 동작. 캐릭터별 분기 금지.
import { VIEW_W } from './util.js';

export function createPlayer(def, x, y) {
  return {
    def, x, y, w: def.w, h: def.h,
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
      x: p.x + p.w, y: p.y + 10, w: r.w, h: r.h,
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

export function drawPlayer(ctx, p, cam) {
  if (p.inv > 0 && (p.inv >> 2) & 1) return; // 무적 중 깜빡임
  const x = Math.round(p.x - cam);
  const y = Math.round(p.y);
  const w = p.w;
  ctx.fillStyle = '#1a1a22'; // 포니테일
  ctx.fillRect(x - 3, y - 2, 4, 8);
  ctx.fillStyle = '#e02838'; // 리본
  ctx.fillRect(x - 1, y - 2, 3, 2);
  ctx.fillStyle = '#1a1a22'; // 머리
  ctx.fillRect(x + 1, y, w - 2, 6);
  ctx.fillStyle = '#f5d6b8'; // 얼굴
  ctx.fillRect(x + 3, y + 5, w - 4, 5);
  ctx.fillStyle = '#1a1a22'; // 눈
  ctx.fillRect(x + w - 3, y + 6, 1, 2);
  ctx.fillStyle = '#f4f4f4'; // 흰 상의
  ctx.fillRect(x + 1, y + 10, w - 2, 7);
  ctx.fillStyle = '#e02838'; // 빨간 하카마
  ctx.fillRect(x + 1, y + 17, w - 2, 6);
  ctx.fillStyle = '#f5d6b8'; // 발목
  ctx.fillRect(x + 2, y + 23, 3, 1);
  ctx.fillRect(x + w - 5, y + 23, 3, 1);
}
