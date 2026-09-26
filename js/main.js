// 부트, 고정 타임스텝 루프, 충돌 처리, 렌더
import { VIEW_W, VIEW_H, overlap, shotBox } from './util.js';
import { createInput } from './input.js';
import { createPlayer, updatePlayer, meleeBox, hurtBox, hurtPlayer, drawPlayer } from './player.js';
import { updateEnemy, drawEnemy } from './enemy.js';
import { createStage, updateStage, drawStage } from './stage.js';
import { buildSpriteSet, buildSimpleSprite, simpleFrame } from './sprites.js';

const STEP = 1000 / 60;
const CHARACTER = 'miko';
const STAGE = 'proto';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const debugEl = document.getElementById('debug');
const msgEl = document.getElementById('msg');
const portrait = matchMedia('(orientation: portrait)');

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  const s = Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
  canvas.style.width = VIEW_W * s + 'px';
  canvas.style.height = VIEW_H * s + 'px';
  canvas.style.left = Math.floor((w - VIEW_W * s) / 2) + 'px';
  canvas.style.top = Math.floor((h - VIEW_H * s) / 2) + 'px';
}

function purify(G, e, amount) {
  e.hp -= amount;
  e.flash = 4;
  if (e.hp > 0) return;
  e.dead = true;
  G.purified++;
  const f = simpleFrame(e.sprite, e.t);
  G.effects.push({ type: 'purify', x: e.x + e.w / 2, y: e.y + e.h / 2, w: e.w, h: e.h, color: e.def.color, frame: f, t: 0, dur: 48 });
}

function update(G, input) {
  if (G.hitstop > 0) { G.hitstop--; return; }

  const p = G.player;
  updateStage(G.stage, G);
  updatePlayer(p, input, G);
  for (const e of G.enemies) updateEnemy(e, G);
  for (const s of G.shots) { s.x += s.vx; s.y += s.vy; }

  // 봉: 적 탄 반사 + 근접 타격
  const m = p.def.melee;
  const mb = meleeBox(p);
  if (mb) {
    if (m.reflect) {
      for (const s of G.shots) {
        if (s.owner !== 'enemy' || !overlap(mb, shotBox(s))) continue;
        s.owner = 'player';
        s.vx = -s.vx * m.reflectSpeed;
        s.vy = -s.vy * m.reflectSpeed;
        s.power = m.reflectPower;
        G.hitstop = m.hitstop;
        G.effects.push({ type: 'spark', x: s.x, y: s.y, t: 0, dur: 8 });
      }
    }
    for (const e of G.enemies) {
      if (e.dead || p.meleeHits.has(e) || !overlap(mb, e)) continue;
      p.meleeHits.add(e);
      G.hitstop = m.hitstop;
      purify(G, e, m.power);
    }
  }

  // 탄 판정
  const hb = hurtBox(p);
  for (const s of G.shots) {
    if (s.gone) continue;
    const b = shotBox(s);
    if (s.owner === 'player') {
      for (const e of G.enemies) {
        if (e.dead || !overlap(b, e)) continue;
        purify(G, e, s.power);
        s.gone = true;
        break;
      }
    } else if (overlap(b, hb)) {
      hurtPlayer(p);
      s.gone = true;
    }
    if (s.x < G.cam - 16 || s.x > G.cam + VIEW_W + 16 || s.y < -16 || s.y > VIEW_H + 16) s.gone = true;
  }
  for (const e of G.enemies) if (!e.dead && overlap(hb, e)) hurtPlayer(p);

  for (const fx of G.effects) fx.t++;

  G.shots = G.shots.filter(s => !s.gone);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.effects = G.effects.filter(fx => fx.t < fx.dur);
  input.endStep();
}

function drawOrb(x, y, r, fill, edge) {
  ctx.fillStyle = edge;
  ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2);
  ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x - r + 1, y - r + 1, r * 2 - 2, r * 2 - 2);
}

function drawEffect(fx, cam) {
  const x = fx.x - cam;
  const q = fx.t / fx.dur;
  if (fx.type === 'spark') {
    ctx.fillStyle = '#ffffff';
    const d = 2 + fx.t;
    ctx.fillRect(Math.round(x - d), Math.round(fx.y), 3, 1);
    ctx.fillRect(Math.round(x + d - 2), Math.round(fx.y), 3, 1);
    ctx.fillRect(Math.round(x), Math.round(fx.y - d), 1, 3);
    ctx.fillRect(Math.round(x), Math.round(fx.y + d - 2), 1, 3);
    return;
  }
  // 정화: 흰 번쩍 → 원래 색으로 돌아온 요괴가 기뻐하며 떠오르고 사라짐 + 빛의 고리·조각
  const left = Math.round(x - fx.w / 2);
  const top = Math.round(fx.y - fx.h / 2);
  ctx.save();
  if (fx.t < 5) {
    ctx.drawImage(fx.frame.white, left, top);
  } else {
    ctx.globalAlpha = q < 0.6 ? 1 : (1 - q) / 0.4;
    const hop = Math.round(q * 16 + Math.abs(Math.sin(fx.t * 0.25)) * 2);
    ctx.drawImage(fx.frame.color, left, top - hop);
  }
  if (q < 0.7) {
    ctx.globalAlpha = 1 - q / 0.7;
    const r = 6 + q * 34;
    ctx.fillStyle = fx.color;
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(fx.y + Math.sin(a) * r), 1, 1);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 + 0.3;
      const d = 4 + q * 26;
      ctx.fillStyle = i & 1 ? '#ffffff' : fx.color;
      ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(fx.y + Math.sin(a) * d - q * 6), 2, 2);
    }
  }
  ctx.restore();
}

function drawOfuda(x, y, s, t) {
  ctx.fillStyle = 'rgba(255,255,255,.3)'; // 잔상
  ctx.fillRect(x - s.w / 2 - 4, y - 1, 3, 1);
  ctx.fillStyle = '#f7f0d8';
  ctx.fillRect(x - s.w / 2, y - s.h / 2, s.w, s.h);
  ctx.fillStyle = '#d23a3a'; // 붉은 먹 글씨
  ctx.fillRect(x, y - s.h / 2, 1, s.h);
  ctx.fillRect(x - 2, y, 1, 1);
  ctx.fillRect(x + 2, y + ((t >> 2) & 1) - 1, 1, 1);
}

function drawShot(s, cam, t) {
  const x = Math.round(s.x - cam);
  const y = Math.round(s.y);
  if (s.kind === 'ofuda') { drawOfuda(x, y, s, t); return; }
  const tx = Math.round(x - s.vx * 3);
  const ty = Math.round(y - s.vy * 3);
  if (s.owner === 'enemy') {
    // 검은 안개 구슬
    ctx.fillStyle = 'rgba(60,30,90,.45)';
    ctx.fillRect(tx - 1, ty - 1, 3, 3);
    drawOrb(x, y, s.r + 1, 'rgba(150,110,200,.3)', 'rgba(150,110,200,.3)');
    drawOrb(x, y, s.r, '#2a1838', '#8a6ab8');
    ctx.fillStyle = '#c8b0f0';
    ctx.fillRect(x - 1, y - 2, 1, 1);
  } else {
    // 반사되어 정화된 금빛 구슬
    ctx.fillStyle = (t >> 1) & 1 ? '#ffffff' : '#ffd84a';
    ctx.fillRect(tx, ty, 2, 2);
    ctx.fillRect(Math.round(x - s.vx * 6), Math.round(y - s.vy * 6), 1, 1);
    drawOrb(x, y, s.r + 1, 'rgba(255,220,120,.35)', 'rgba(255,220,120,.35)');
    drawOrb(x, y, s.r, '#fff4a0', '#ffb000');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 2, 1, 1);
  }
}

function render(G) {
  const cam = G.cam;
  const p = G.player;
  drawStage(ctx, G.stage, cam);
  for (const e of G.enemies) drawEnemy(ctx, e, cam);
  drawPlayer(ctx, p, cam);

  const mb = meleeBox(p);
  if (mb) { // 판정 확인용 옅은 테두리 (프로토타입)
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.strokeRect(Math.round(mb.x - cam) + 0.5, Math.round(mb.y) + 0.5, mb.w - 1, mb.h - 1);
  }

  G.frame++;
  for (const s of G.shots) drawShot(s, cam, G.frame);
  for (const fx of G.effects) drawEffect(fx, cam);
}

async function boot() {
  let data;
  try {
    const [characters, yokai, stages] = await Promise.all([
      loadJSON('data/characters.json'),
      loadJSON('data/yokai.json'),
      loadJSON('data/stages.json'),
    ]);
    const spriteDef = await loadJSON(characters[CHARACTER].spriteSet);
    const yokaiSpriteDefs = {};
    await Promise.all(Object.entries(yokai).map(async ([id, y]) => {
      yokaiSpriteDefs[id] = await loadJSON(y.spriteSet);
    }));
    data = { characters, yokai, stages, spriteDef, yokaiSpriteDefs };
  } catch (err) {
    msgEl.textContent = '데이터를 읽을 수 없습니다.\nindex.html 폴더에서 python -m http.server 8000 으로 실행해 주세요.\n(' + err.message + ')';
    return;
  }

  ctx.imageSmoothingEnabled = false;
  const input = createInput(document.getElementById('controls'));
  const stage = createStage(data.stages[STAGE]);
  const def = data.characters[CHARACTER];
  const yokaiSprites = {};
  for (const [id, d] of Object.entries(data.yokaiSpriteDefs)) yokaiSprites[id] = buildSimpleSprite(d);
  const G = {
    data, stage, cam: 0, frame: 0,
    sprites: { yokai: yokaiSprites },
    player: createPlayer(def, 40, stage.groundY - def.h, buildSpriteSet(data.spriteDef)),
    enemies: [], shots: [], effects: [],
    hitstop: 0, purified: 0,
  };

  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', resize);

  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fps = 0;
  let fpsT = last;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250;
    if (!portrait.matches) {
      acc += dt;
      while (acc >= STEP) {
        update(G, input);
        acc -= STEP;
      }
    }
    render(G);

    frames++;
    if (now - fpsT >= 500) {
      fps = Math.round(frames * 1000 / (now - fpsT));
      frames = 0;
      fpsT = now;
      const p = G.player;
      debugEl.textContent =
        `FPS ${fps}\n` +
        `spd ${def.speed}  jump ${def.jump}  grav ${def.gravity}\n` +
        `HP ${p.hp}/${def.hp}  정화 ${G.purified}`;
    }
  }
  requestAnimationFrame(frame);
}

boot();
