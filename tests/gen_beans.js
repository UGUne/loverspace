#!/usr/bin/env node
// gen_beans.js — 生成 12 个 Telegram 风格「动态黄豆」表情 SVG（SMIL 动画，<img>内可动）
const fs = require('fs');
const path = require('path');
const DIR = '/workspace/stickers';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

// 黄豆身体（带渐变/高光/豆脐）
function body(tint) {
  tint = tint || {};
  const c1 = tint.c1 || '#FFE49A', c2 = tint.c2 || '#FFD23F', c3 = tint.c3 || '#F2A900';
  return `
  <defs>
    <radialGradient id="g" cx="38%" cy="32%" r="75%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="60%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="66" rx="40" ry="44" fill="url(#g)" stroke="${c3}" stroke-width="2"/>
  <ellipse cx="48" cy="50" rx="13" ry="9" fill="#fff" opacity="0.35"/>
  <path d="M58 96 q4 8 10 6" stroke="${c3}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`;
}
const BLUSH = `<ellipse cx="40" cy="74" rx="7" ry="4.5" fill="#FF8FB0" opacity="0.65"/><ellipse cx="80" cy="74" rx="7" ry="4.5" fill="#FF8FB0" opacity="0.65"/>`;
const DARK = '#5A3A12';

// 表情部件
const faces = {
  happy: `<path d="M40 58 Q47 49 54 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 58 Q73 49 80 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M46 76 Q60 90 74 76" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  laugh: `<path d="M40 58 Q47 49 54 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 58 Q73 49 80 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="80" rx="11" ry="9" fill="${DARK}"/><path d="M52 80 Q60 86 68 80" stroke="#FF7A9C" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  love: `<path id="he" d="M47 56 c-5 -7 -15 -2 -10 5 c2 4 10 9 10 9 c0 0 8 -5 10 -9 c5 -7 -5 -12 -10 -5 z" fill="#E8436B"/><path d="M73 56 c-5 -7 -15 -2 -10 5 c2 4 10 9 10 9 c0 0 8 -5 10 -9 c5 -7 -5 -12 -10 -5 z" fill="#E8436B"/><path d="M48 78 Q60 88 72 78" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  kiss: `<circle cx="47" cy="58" r="4.5" fill="${DARK}"/><circle cx="73" cy="58" r="4.5" fill="${DARK}"/><circle cx="60" cy="80" r="5" fill="#E57373"/>`,
  cry: `<circle cx="47" cy="57" r="4.5" fill="${DARK}"/><circle cx="73" cy="57" r="4.5" fill="${DARK}"/><path d="M46 82 Q60 72 74 82" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  shy: `<path d="M41 58 q6 -5 12 0" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M67 58 q6 -5 12 0" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 78 Q60 85 70 78" stroke="${DARK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  angry: `<path d="M38 52 L54 58" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/><path d="M82 52 L66 58" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/><circle cx="47" cy="62" r="3.5" fill="${DARK}"/><circle cx="73" cy="62" r="3.5" fill="${DARK}"/><path d="M48 82 L72 82" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/><path d="M54 82 v-6 M60 82 v-6 M66 82 v-6" stroke="${DARK}" stroke-width="2.5"/>`,
  sleep: `<path d="M40 58 H54" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/><path d="M66 58 H80" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/><path d="M52 80 Q60 86 68 80" stroke="${DARK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  sad: `<path d="M40 56 Q47 62 54 56" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 56 Q73 62 80 56" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 82 Q60 74 72 82" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  think: `<circle cx="47" cy="58" r="4" fill="${DARK}"/><circle cx="73" cy="58" r="4" fill="${DARK}"/><path d="M52 80 Q60 84 68 80" stroke="${DARK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="86" cy="84" rx="9" ry="7" fill="#FFE49A" stroke="${DARK}" stroke-width="2"/><text x="86" y="88" font-size="11" font-family="Arial" font-weight="700" fill="${DARK}" text-anchor="middle">?</text>`,
  celebrate: `<path d="M40 58 Q47 49 54 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 58 Q73 49 80 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M46 78 Q60 92 74 78" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="34" rx="8" ry="6" fill="#FFD23F" stroke="${DARK}" stroke-width="2"/><ellipse cx="90" cy="34" rx="8" ry="6" fill="#FFD23F" stroke="${DARK}" stroke-width="2"/>`,
  dance: `<path d="M40 58 Q47 49 54 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 58 Q73 49 80 58" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 78 Q60 88 72 78" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
};
// 配件（带浮动/下落动画）
const accents = {
  love: `<g><path d="M88 30 c-4 -6 -12 -2 -8 4 c2 3 8 7 8 7 c0 0 6 -4 8 -7 c4 -6 -4 -10 -8 -4 z" fill="#FF5C8A"><animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 6; 0 -10; 0 6" dur="1.6s" repeatCount="indefinite"/></path></g>`,
  kiss: `<g><path d="M86 34 c-3 -5 -10 -1 -7 4 c1 2 7 6 7 6 c0 0 5 -3 7 -6 c3 -5 -4 -9 -7 -4 z" fill="#FF7AA8" opacity="0.9"><animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 4; 0 -8; 0 4" dur="1.5s" repeatCount="indefinite"/></path></g>`,
  cry: `<g><path d="M50 64 q-3 10 0 14 q3 -4 0 -14z" fill="#7EC8FF"><animateTransform attributeName="transform" type="translate" values="0 0; 0 16" dur="1.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="1.1s" repeatCount="indefinite"/></path><path d="M70 64 q-3 10 0 14 q3 -4 0 -14z" fill="#7EC8FF"><animateTransform attributeName="transform" type="translate" values="0 0; 0 16" dur="1.3s" begin="0.3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="1.3s" begin="0.3s" repeatCount="indefinite"/></path></g>`,
  sleep: `<g fill="${DARK}" font-family="Arial" font-weight="700"><text x="84" y="40" font-size="12">Z<animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></text><text x="92" y="30" font-size="15">Z<animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.4s" repeatCount="indefinite"/></text><text x="100" y="20" font-size="18">Z<animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.8s" repeatCount="indefinite"/></text></g>`,
  think: ``,
  celebrate: `<g fill="#FFC83D" stroke="${DARK}" stroke-width="1.5"><path d="M22 20 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"><animateTransform attributeName="transform" type="rotate" values="0 22 20;360 22 20" dur="3s" repeatCount="indefinite"/></path><path d="M96 16 l1.5 5 5 1.5 -5 1.5 -1.5 5 -1.5 -5 -5 -1.5 5 -1.5z"><animateTransform attributeName="transform" type="rotate" values="0 96 16;360 96 16" dur="2.4s" repeatCount="indefinite"/></path></g>`,
  dance: `<g fill="${DARK}"><g><circle cx="92" cy="36" r="4"/><path d="M92 32 v-7 M92 32 l5 -3 M92 32 l-5 -3" stroke="${DARK}" stroke-width="2" fill="none" stroke-linecap="round"/><animateTransform attributeName="transform" type="translate" values="0 4; 0 -8; 0 4" dur="1.4s" repeatCount="indefinite"/></g><g><circle cx="100" cy="52" r="3"/><path d="M100 49 v-5 M100 49 l4 -2 M100 49 l-4 -2" stroke="${DARK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><animateTransform attributeName="transform" type="translate" values="0 -4; 0 6; 0 -4" dur="1.4s" begin="0.5s" repeatCount="indefinite"/></g></g>`
};
// 整体弹跳/晃动
const anim = {
  bounce: `<animateTransform attributeName="transform" type="translate" values="0 0; 0 -7; 0 0" dur="1.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>`,
  shake: `<animateTransform attributeName="transform" type="rotate" values="-4 60 66; 4 60 66; -4 60 66" dur="0.5s" repeatCount="indefinite"/>`,
  sway: `<animateTransform attributeName="transform" type="rotate" values="-3 60 66; 3 60 66; -3 60 66" dur="2.4s" repeatCount="indefinite"/>`,
  jump: `<animateTransform attributeName="transform" type="translate" values="0 0; 0 -10; 0 0" dur="0.9s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.4;1" keySplines="0.2 0.8 0.3 1;0.4 0 0.6 1"/>`,
  wiggle: `<animateTransform attributeName="transform" type="rotate" values="-6 60 66; 6 60 66; -6 60 66" dur="1.1s" repeatCount="indefinite"/>`
};
const blushFor = { love: 1, shy: 1, kiss: 1, celebrate: 1, dance: 1, laugh: 1 };

const beans = [
  { key: 'bean-hi', name: '黄豆挥手', face: 'happy', acc: '', an: 'bounce', tint: { c2: '#FFD23F' } },
  { key: 'bean-love', name: '黄豆比心', face: 'love', acc: 'love', an: 'bounce', tint: { c2: '#FFC93C' } },
  { key: 'bean-kiss', name: '黄豆飞吻', face: 'kiss', acc: 'kiss', an: 'sway', tint: { c2: '#FFCF52' } },
  { key: 'bean-cry', name: '黄豆大哭', face: 'cry', acc: 'cry', an: 'shake', tint: { c2: '#F6C84B' } },
  { key: 'bean-laugh', name: '黄豆爆笑', face: 'laugh', acc: '', an: 'bounce', tint: { c2: '#FFD23F' } },
  { key: 'bean-shy', name: '黄豆害羞', face: 'shy', acc: '', an: 'sway', tint: { c2: '#FFCF66' } },
  { key: 'bean-angry', name: '黄豆生气', face: 'angry', acc: '', an: 'shake', tint: { c2: '#FFB84A' } },
  { key: 'bean-sleep', name: '黄豆睡觉', face: 'sleep', acc: 'sleep', an: 'sway', tint: { c2: '#E9D27A' } },
  { key: 'bean-dance', name: '黄豆跳舞', face: 'dance', acc: 'dance', an: 'wiggle', tint: { c2: '#FFD23F' } },
  { key: 'bean-think', name: '黄豆思考', face: 'think', acc: '', an: 'sway', tint: { c2: '#FFCF52' } },
  { key: 'bean-celebrate', name: '黄豆庆祝', face: 'celebrate', acc: 'celebrate', an: 'jump', tint: { c2: '#FFD23F' } },
  { key: 'bean-sad', name: '黄豆委屈', face: 'sad', acc: '', an: 'sway', tint: { c2: '#F4C24A' } }
];

beans.forEach(function (b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <g>${anim[b.an] || anim.bounce}
    ${body(b.tint)}
    ${faces[b.face]}
    ${blushFor[b.face] ? BLUSH : ''}
    ${accents[b.acc] || ''}
  </g>
</svg>
`;
  fs.writeFileSync(path.join(DIR, b.key + '.svg'), svg.trim() + '\n');
  console.log('wrote', b.key + '.svg');
});
console.log('done', beans.length);
