// 스테이지 배경: 시작할 때 레이어를 오프스크린 캔버스에 한 번 그려 두고 패럴랙스로 반복 표시
// 색·배치 테마는 stages.json 의 theme
import { VIEW_W, VIEW_H } from './util.js';

function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function layer(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'));
  return cv;
}

function disc(c, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function drawSky(c, th, groundY) {
  const bands = th.sky;
  const bh = groundY / bands.length;
  bands.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(0, Math.floor(i * bh), VIEW_W, Math.ceil(bh) + 1);
  });
  // 띠 경계는 체크무늬 디더로 부드럽게
  for (let i = 1; i < bands.length; i++) {
    const y = Math.floor(i * bh);
    for (let x = 0; x < VIEW_W; x++) {
      if ((x + y) & 1) { c.fillStyle = bands[i]; c.fillRect(x, y - 1, 1, 1); }
      else { c.fillStyle = bands[i - 1]; c.fillRect(x, y, 1, 1); }
    }
  }
  c.fillStyle = th.moonGlow;
  disc(c, 256, 34, 15);
  c.fillStyle = th.moon;
  disc(c, 256, 34, 11);
  c.fillStyle = th.moonShade;
  c.fillRect(251, 30, 3, 2);
  c.fillRect(259, 37, 2, 2);
  c.fillRect(255, 40, 3, 1);
}

function drawMountains(c, th, w, groundY) {
  const k = Math.PI * 2 / w; // 정수 주기만 써서 이음매 없이 반복
  for (let x = 0; x < w; x++) {
    const far = 58 + 14 * Math.sin(x * k * 2) + 8 * Math.sin(x * k * 5 + 1);
    c.fillStyle = th.mountainFar;
    c.fillRect(x, Math.round(groundY - far), 1, Math.round(far));
    const near = 32 + 10 * Math.sin(x * k * 3 + 2) + 5 * Math.sin(x * k * 8);
    c.fillStyle = th.mountainNear;
    c.fillRect(x, Math.round(groundY - near), 1, Math.round(near));
  }
}

function cedar(c, th, x, bottom, height, maxHalf) {
  const top = bottom - height;
  for (let r = 0; r < height - 6; r++) {
    const tier = (r % 12) / 12;
    const half = Math.max(1, Math.floor((r / height) * maxHalf * (0.55 + 0.45 * tier)));
    c.fillStyle = th.tree;
    c.fillRect(x - half, top + r, half * 2 + 1, 1);
    c.fillStyle = th.treeLight;
    c.fillRect(x - half, top + r, 1, 1);
  }
  c.fillStyle = th.treeTrunk;
  c.fillRect(x - 1, bottom - 8, 3, 8);
}

function drawTrees(c, th, w, groundY) {
  const R = rng(11);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(R() * w);
    const h = 60 + Math.floor(R() * 40);
    const half = 9 + Math.floor(R() * 5);
    for (const ox of [-w, 0, w]) cedar(c, th, x + ox, groundY, h, half);
  }
}

function torii(c, th, x, groundY) {
  const h = 84;
  const top = groundY - h;
  c.fillStyle = th.torii;
  c.fillRect(x, top + 6, 4, h - 6); // 기둥
  c.fillRect(x + 38, top + 6, 4, h - 6);
  c.fillRect(x - 5, top + 16, 52, 3); // 누키(아래 가로대)
  c.fillRect(x + 19, top + 6, 4, 10); // 가쿠즈카
  c.fillStyle = th.toriiDark;
  c.fillRect(x - 9, top, 60, 4); // 가사기(위 가로대)
  c.fillRect(x - 11, top - 1, 3, 2); // 끝이 살짝 들림
  c.fillRect(x + 50, top - 1, 3, 2);
  c.fillStyle = th.toriiShade;
  c.fillRect(x - 7, top + 4, 56, 2);
  c.fillRect(x + 3, top + 6, 1, h - 6);
  c.fillRect(x + 41, top + 6, 1, h - 6);
  c.fillStyle = th.stoneShade; // 기둥 받침
  c.fillRect(x - 1, groundY - 3, 6, 3);
  c.fillRect(x + 37, groundY - 3, 6, 3);
}

function lantern(c, th, x, groundY) {
  const b = groundY;
  c.fillStyle = th.stone;
  c.fillRect(x - 6, b - 3, 13, 3); // 받침
  c.fillRect(x - 2, b - 14, 5, 11); // 기둥
  c.fillRect(x - 5, b - 17, 11, 3); // 중대
  c.fillRect(x - 4, b - 24, 9, 7); // 화대
  c.fillRect(x - 7, b - 27, 15, 3); // 지붕
  c.fillRect(x - 5, b - 29, 11, 2);
  c.fillRect(x - 1, b - 31, 3, 2); // 보주
  c.fillStyle = th.lanternLight; // 꺼진 불창
  c.fillRect(x - 2, b - 22, 5, 4);
  c.fillStyle = th.stoneShade;
  c.fillRect(x + 2, b - 14, 1, 11);
  c.fillRect(x - 7, b - 25, 15, 1);
  c.fillRect(x + 4, b - 24, 1, 7);
}

// toriiX / lanternX: 근경 레이어(폭 640) 안의 x 좌표
function drawShrine(c, th, w, groundY) {
  for (const x of th.toriiX) torii(c, th, x, groundY);
  for (const x of th.lanternX) lantern(c, th, x, groundY);
}

function drawMist(c, th, w, h) {
  const R = rng(23);
  c.fillStyle = th.mist;
  for (let i = 0; i < 18; i++) {
    const cx = Math.floor(R() * w);
    const cy = Math.floor(h * 0.4 + R() * h * 0.5);
    const rw = 20 + Math.floor(R() * 30);
    const rh = 3 + Math.floor(R() * 4);
    for (const ox of [-w, 0, w]) {
      for (let dy = -rh; dy <= rh; dy++) {
        const half = Math.floor(rw * Math.sqrt(1 - (dy * dy) / (rh * rh)));
        c.fillRect(cx + ox - half, cy + dy, half * 2, 1);
      }
    }
  }
}

function drawGroundTile(c, th, w, h) {
  c.fillStyle = th.ground;
  c.fillRect(0, 0, w, h);
  c.fillStyle = th.groundLine;
  c.fillRect(0, 0, w, 2);
  c.fillStyle = th.groundShade;
  c.fillRect(0, 2, w, 1);
  // 돌바닥 이음매 (두 줄, 엇갈림)
  c.fillRect(0, 11, w, 1);
  c.fillRect(0, 20, w, 1);
  for (let x = 0; x < w; x += 16) {
    c.fillRect(x, 3, 1, 8);
    c.fillRect(x + 8, 12, 1, 8);
  }
  c.fillStyle = th.groundLine;
  for (let x = 0; x < w; x += 16) {
    c.fillRect(x + 1, 3, 1, 1);
    c.fillRect(x + 9, 12, 1, 1);
  }
}

export function createBackground(th, groundY) {
  const gh = VIEW_H - groundY;
  return {
    sky: layer(VIEW_W, groundY, c => drawSky(c, th, groundY)),
    layers: [
      { cv: layer(640, groundY, c => drawMountains(c, th, 640, groundY)), p: 0.1, y: 0 },
      { cv: layer(480, groundY, c => drawTrees(c, th, 480, groundY)), p: 0.3, y: 0 },
      { cv: layer(640, groundY, c => drawShrine(c, th, 640, groundY)), p: 0.6, y: 0 },
      { cv: layer(400, 40, c => drawMist(c, th, 400, 40)), p: 0.8, y: groundY - 34 },
    ],
    ground: layer(64, gh, c => drawGroundTile(c, th, 64, gh)),
  };
}

function tile(ctx, cv, offset, y) {
  const w = cv.width;
  for (let x = -(((Math.round(offset) % w) + w) % w); x < VIEW_W; x += w) ctx.drawImage(cv, x, y);
}

export function drawBackground(ctx, bg, cam, groundY) {
  ctx.drawImage(bg.sky, 0, 0);
  for (const l of bg.layers) tile(ctx, l.cv, cam * l.p, l.y);
  tile(ctx, bg.ground, cam, groundY);
}
