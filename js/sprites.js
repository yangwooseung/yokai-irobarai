// 문자열 도트 데이터(파츠 조합) → 오프스크린 캔버스 프레임
// 나중에 PNG 스프라이트 시트로 바꿔도 drawSprite 호출부는 그대로 쓸 수 있게 한다.

function paint(ctx, rows, palette, oy) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y + oy, 1, 1);
    }
  });
}

export function buildSpriteSet(def) {
  const anims = {};
  for (const [name, a] of Object.entries(def.anims)) {
    const frames = a.frames.map(f => {
      const cv = document.createElement('canvas');
      cv.width = def.w;
      cv.height = def.h + 1; // headDy 여유
      const c = cv.getContext('2d');
      const torso = f.torso || 'stand';
      // 머리를 마지막에 그려 목선이 상체 위로 오게 한다
      paint(c, def.parts.legs[f.legs || 'stand'], def.palette, def.partY.legs + 1);
      paint(c, def.parts.torso[torso], def.palette, def.partY.torso + 1);
      paint(c, def.parts.head[f.head || 'normal'], def.palette, def.partY.head + 1 + (f.headDy || 0));
      return { canvas: cv, dy: f.dy || 0, hand: def.hands[torso] };
    });
    anims[name] = { rate: a.rate, frames };
  }
  return { w: def.w, h: def.h, ax: def.ax, anims };
}

// 원본 색 캔버스에서 픽셀 단위로 색을 바꾼 사본을 만든다
function recolor(src, fn) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const c = cv.getContext('2d');
  c.drawImage(src, 0, 0);
  const img = c.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// 검은 안개에 물든 톤: 채도 제거 + 어둡게 + 보랏빛
const fogTone = (r, g, b) => {
  const l = (r * 0.3 + g * 0.59 + b * 0.11) * 0.55;
  return [l * 0.95 + 14, l * 0.9 + 8, l * 1.05 + 26];
};
const whiteTone = () => [255, 255, 255];

// 요괴처럼 프레임만 있는 스프라이트: 원래 색 / 안개 톤 / 흰 번쩍 3벌
export function buildSimpleSprite(def) {
  const frames = def.frames.map(rows => {
    const cv = document.createElement('canvas');
    cv.width = def.w;
    cv.height = def.h;
    paint(cv.getContext('2d'), rows, def.palette, 0);
    return { color: cv, fog: recolor(cv, fogTone), white: recolor(cv, whiteTone) };
  });
  return { w: def.w, h: def.h, rate: def.rate, frames };
}

export function simpleFrame(set, t) {
  return set.frames[Math.floor(t / set.rate) % set.frames.length];
}

export function spriteFrame(set, anim, t) {
  const a = set.anims[anim];
  return a.frames[Math.floor(t / a.rate) % a.frames.length];
}

// (x, bottom) = 기준점(ax) 위치와 발밑. 그린 프레임의 좌상단을 돌려준다.
export function drawSprite(ctx, set, frame, x, bottom) {
  const left = Math.round(x - set.ax);
  const top = Math.round(bottom - set.h - 1 + frame.dy);
  ctx.drawImage(frame.canvas, left, top);
  return { left, top: top + 1 };
}
