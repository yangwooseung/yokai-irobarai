export const VIEW_W = 320;
export const VIEW_H = 180;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// 탄은 중심 좌표로 관리한다. 원형(r)도 판정은 사각형으로 넉넉하게.
export function shotBox(s) {
  if (s.r) return { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
  return { x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h };
}
