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
