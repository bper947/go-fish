"use strict";
// ===== Characters: looks, special abilities and the select screen =====
// Loaded before the main game script. Functions here use the game's globals
// (ctx, fish, score, obstacles, particles, popups, sfx, text, circle, ...) when called.

const ABILITY_RECHARGE = 20;            // points until Ink Escape / a spare arm comes back
const MAGNET_RANGE = 120, MAGNET_PULL = 260;
const REGROW_INVINCIBLE = 1.5;          // seconds of invincibility after Stella loses an arm

const CHARACTERS = {
  finn:   { name: 'Finn',   kind: 'Clownfish', ability: 'Pearl Magnet', desc: ['Nearby pearls', 'drift to you'], draw: drawFinn },
  inky:   { name: 'Inky',   kind: 'Octopus',   ability: 'Ink Escape',   desc: ['Escape a', 'shark bite'],     draw: drawInky },
  stella: { name: 'Stella', kind: 'Starfish',  ability: 'Regrow',       desc: ['Survive a', 'coral crash'],   draw: drawStella }
};
const CHARACTER_IDS = Object.keys(CHARACTERS);

let charId = 'finn';
let ability = { ready: true, rechargeAt: 0, invincibleT: 0 };

// ===== Abilities =====
function resetAbility() { ability = { ready: true, rechargeAt: 0, invincibleT: 0 }; }
const isInvincible = () => ability.invincibleT > 0;

function useAbility() { ability.ready = false; ability.rechargeAt = score + ABILITY_RECHARGE; }

function updateAbility(dt) {
  ability.invincibleT = Math.max(0, ability.invincibleT - dt);
  if (!ability.ready && score >= ability.rechargeAt) {
    ability.ready = true;
    sfx.select();
    popups.push({ x: FISH_X + 10, y: fish.y - 40, text: charId === 'inky' ? 'Ink ready!' : 'Arm regrown!', life: 1.1 });
  }
  if (charId === 'finn') pearlMagnet(dt);
}

// Finn: pearls within range drift toward the fish
function pearlMagnet(dt) {
  for (const o of obstacles) {
    if (!o.pearl || o.pearl.taken) continue;
    const p = pearlPos(o), dx = FISH_X - p.x, dy = fish.y - p.y, d = Math.hypot(dx, dy);
    if (d > MAGNET_RANGE || d < 1) continue;
    const step = Math.min(d, MAGNET_PULL * dt);
    o.pearl.dx = (o.pearl.dx || 0) + dx / d * step;
    o.pearl.dy += dy / d * step;
    if (Math.random() < 0.3) {
      particles.push({ kind: 'spark', x: p.x, y: p.y, vx: dx / d * 40, vy: dy / d * 40, r: rand(1, 2), life: 0.3, max: 0.3 });
    }
  }
}

// Inky: a shark bite is blocked by an ink cloud, and the blinded shark swims harmlessly past
function tryInkEscape() {
  if (charId !== 'inky' || !ability.ready) return false;
  useAbility();
  shark.harmless = true;
  sfx.ink();
  popups.push({ x: FISH_X + 10, y: fish.y - 40, text: 'Inked!', life: 0.9 });
  for (let i = 0; i < 14; i++) {
    particles.push({ kind: 'ink', x: FISH_X + rand(0, 30), y: fish.y + rand(-12, 12), vx: rand(-40, 120), vy: rand(-50, 50), r: rand(6, 12), life: rand(0.8, 1.3), max: 1.3 });
  }
  return true;
}

// Stella: a crash costs an arm instead of the run, with a bounce back toward safety
function tryRegrow(obstacle) {
  if (charId !== 'stella' || !ability.ready) return false;
  useAbility();
  ability.invincibleT = REGROW_INVINCIBLE;
  const middle = obstacle ? obstacle.gapY : (H - GROUND) / 2;
  fish.vy = fish.y > middle ? SWIM : 220;
  sfx.bonk();
  popups.push({ x: FISH_X + 10, y: fish.y - 40, text: '-1 arm!', life: 0.9 });
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 180);
    particles.push({ kind: 'spark', x: FISH_X, y: fish.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 3.5), life: rand(0.3, 0.7), max: 0.7 });
  }
  return true;
}

// Keeps an invincible Stella inside the playfield
function keepInBounds() {
  if (fish.y + FISH_R > H - GROUND) { fish.y = H - GROUND - FISH_R; fish.vy = SWIM * 0.8; }
  if (fish.y - FISH_R < 0) { fish.y = FISH_R; fish.vy = 100; }
}

function drawAbilityHUD() {
  const c = CHARACTERS[charId];
  const label = charId === 'finn' ? 'Magnet: ON'
    : ability.ready ? `${c.ability}: READY` : `${c.ability}: ${ability.rechargeAt - score} pts`;
  text(label, 17, 84, 13, ability.ready ? '#9ef0c0' : '#cfefff', 'left');
}

// ===== Character art (drawn facing right, centred on 0,0) =====
// s = { tail, mouth, dead, arms }
function drawEye(x, y, dead) {
  if (dead) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; circle(x, y, 5);
    ctx.fillStyle = '#111'; circle(x + 1.5, y, 2.6);
  }
}

function drawSideMouth(m, x) {                                   // gaping mouth for eating sharks
  if (m <= 0.05) return;
  ctx.fillStyle = '#5a1d26';
  ctx.beginPath(); ctx.moveTo(x, 2 - 9 * m); ctx.lineTo(x - 14, 4); ctx.lineTo(x, 6 + 9 * m); ctx.closePath(); ctx.fill();
}

function drawFinn(s) {
  const sw = Math.sin(s.tail) * 6;
  ctx.fillStyle = '#ff7a1a';                                     // tail
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(-30, -12 + sw); ctx.lineTo(-25, sw * 0.5); ctx.lineTo(-30, 12 + sw);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ff8c2a';                                     // top fin
  ctx.beginPath(); ctx.moveTo(-8, -11); ctx.quadraticCurveTo(0, -25, 9, -11); ctx.fill();

  const g = ctx.createLinearGradient(0, -14, 0, 14);             // body
  g.addColorStop(0, '#ffb347'); g.addColorStop(1, '#ff6a00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';                    // clownfish stripe
  ctx.beginPath(); ctx.ellipse(-3, 0, 3.5, 13, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#ffa040';                                     // side fin
  ctx.beginPath(); ctx.ellipse(3, 6, 6, 3, 0.6 + Math.sin(s.tail) * 0.3, 0, Math.PI * 2); ctx.fill();

  drawSideMouth(s.mouth, 23);
  drawEye(10, -4, s.dead);
}

function drawInky(s) {
  ctx.strokeStyle = '#9b4fc4'; ctx.lineCap = 'round'; ctx.lineWidth = 5;   // tentacles trail behind
  for (let i = 0; i < 4; i++) {
    const by = 1 + i * 3.5, ph = s.tail + i * 0.9;
    ctx.beginPath(); ctx.moveTo(-6, by);
    ctx.quadraticCurveTo(-18, by + 4 + Math.sin(ph) * 5, -31 - i * 1.5, by + 2 + Math.sin(ph + 1.2) * 7);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  const g = ctx.createRadialGradient(-3, -9, 3, 0, -2, 20);     // head
  g.addColorStop(0, '#dd9cff'); g.addColorStop(1, '#8e44ad');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -2, 17, 15, -0.25, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';                   // spots
  circle(-7, -9, 2.5); circle(-1, -13, 1.8); circle(-10, -2, 1.6);

  drawSideMouth(s.mouth, 19);
  drawEye(8, -3, s.dead);
}

function drawStella(s) {
  ctx.save();
  ctx.rotate(s.tail * 0.08);                                     // slow spin while swimming
  const R = 19, r = 8;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R);
  g.addColorStop(0, '#ffd08a'); g.addColorStop(1, '#ff6f61');
  ctx.fillStyle = g; ctx.strokeStyle = '#ff6f61'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5, a2 = a + Math.PI / 5;
    const len = i === 4 && s.arms < 5 ? r + 3 : R;               // a lost arm is just a stub
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
  }
  ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';                   // dots along the arms
  for (let i = 0; i < s.arms; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    circle(Math.cos(a) * 12, Math.sin(a) * 12, 1.6);
  }
  ctx.restore();

  if (s.mouth > 0.05) {                                          // face stays upright
    ctx.fillStyle = '#5a1d26';
    ctx.beginPath(); ctx.ellipse(1, 5, 3 + 5 * s.mouth, 1.5 + 5 * s.mouth, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#7a2a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(1, 3, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.save(); ctx.scale(0.7, 0.7);
  drawEye(-4, -5, s.dead); drawEye(7, -5, s.dead);
  ctx.restore();
}

// ===== Character select screen =====
const CARD_W = 120, CARD_H = 195, CARD_Y = 180, CARD_GAP = 15;
const playBtn = () => ({ x: W / 2 - 90, y: 400, w: 180, h: 54 });   // W comes from the main script
const cardX = i => (W - CARD_W * 3 - CARD_GAP * 2) / 2 + i * (CARD_W + CARD_GAP);
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function cardAt(p) {
  const i = CHARACTER_IDS.findIndex((_, k) => inRect(p, { x: cardX(k), y: CARD_Y, w: CARD_W, h: CARD_H }));
  return i < 0 ? null : CHARACTER_IDS[i];
}

function selectChar(id) {
  if (id === charId) return;
  charId = id;
  store.set('fishyDash.char', id);
  sfx.select();
}

function cycleChar(dir) {
  const i = CHARACTER_IDS.indexOf(charId);
  selectChar(CHARACTER_IDS[(i + dir + CHARACTER_IDS.length) % CHARACTER_IDS.length]);
}

function drawCharacterSelect() {
  text('Go Fish', W / 2, 100, 56, '#ffd166');
  text('Choose your swimmer', W / 2, 150, 18, '#cfefff');

  CHARACTER_IDS.forEach((id, i) => {
    const c = CHARACTERS[id], x = cardX(i), sel = id === charId;
    const lift = sel ? -6 : 0, cx = x + CARD_W / 2, y = CARD_Y + lift;
    ctx.fillStyle = sel ? 'rgba(255, 209, 102, 0.18)' : 'rgba(0, 30, 60, 0.45)';
    roundRect(x, y, CARD_W, CARD_H, 14); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd166' : 'rgba(120, 210, 255, 0.3)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();

    ctx.save();
    ctx.translate(cx, y + 52 + (sel ? Math.sin(time * 3) * 5 : 0)); ctx.scale(1.4, 1.4);
    c.draw({ tail: time * (sel ? 10 : 4), mouth: 0, dead: false, arms: 5 });
    ctx.restore();

    text(c.name, cx, y + 110, 20, '#ffffff');
    text(c.kind, cx, y + 130, 12, '#9fd8f0');
    text(c.ability, cx, y + 154, 13, '#ffd166');
    text(c.desc[0], cx, y + 172, 11, '#cfefff');
    text(c.desc[1], cx, y + 186, 11, '#cfefff');
  });

  const b = playBtn(), pulse = 1 + Math.sin(time * 4) * 0.03;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#2ecc71'; roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 27); ctx.fill();
  text('▶ PLAY', 0, 2, 26, '#ffffff');
  ctx.restore();
  text('Space to play · ← → to choose', W / 2, 478, 13, '#9fd8f0');

  text(`Best: ${best}`, W / 2, 515, 22, '#ffd166');
  text('Pearls are worth +3', W / 2, 555, 15, '#cfefff');
  text('Beware the shark from score 5!', W / 2, 580, 15, '#ff8fa3');
  text('…or collect 3 pearls and eat it!', W / 2, 605, 15, '#ffd166');
}
