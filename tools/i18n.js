// Переводы игры: находит в src/game.js строки с кириллицей и подменяет их при сборке на L('id', 'русский текст').
// Словари лежат в i18n/<язык>.json ({ id: перевод }), id — короткий хэш русской строки, поэтому
// перестановка кода переводы не ломает, а новая или изменённая строка просто показывается по-русски, пока её не переведут.
const CYR = /[А-яЁё]/;

// Простой лексер JS: пропускает комментарии, шаблоны и регулярки, возвращает строки в одинарных кавычках с кириллицей
function scan(src) {
  const out = [];
  let i = 0, prev = ''; // prev — последний значимый символ (для отличия регулярки от деления)
  const n = src.length;
  const reAllowed = () => !prev || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /\b(return|typeof|case|do|else|in|of|new|delete|void|throw)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd());
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      const raw = src.slice(i, j + 1);
      if (c === "'" && CYR.test(raw)) out.push({ start: i, end: j + 1, raw, value: decode(raw) });
      i = j + 1; prev = 'a'; continue;
    }
    if (c === '`') { // шаблон: внутри ${} может быть код, кириллицы в шаблонах в игре нет
      let j = i + 1, depth = 0;
      while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (depth === 0 && src[j] === '`') break; if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue; } if (depth && src[j] === '}') depth--; j++; }
      i = j + 1; prev = 'a'; continue;
    }
    if (c === '/' && reAllowed()) { // регулярка
      let j = i + 1, cls = false;
      while (j < n && (src[j] !== '/' || cls)) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      j++; while (/[a-z]/.test(src[j])) j++;
      i = j; prev = 'a'; continue;
    }
    if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? 'a' : c;
    i++;
  }
  return out;
}
const decode = (raw) => JSON.parse('"' + raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
// FNV-1a 32 бита в base36: стабильный короткий id строки
function id(text) {
  let h = 0x811c9dc5;
  for (const ch of Buffer.from(text, 'utf8')) { h ^= ch; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, '0');
}
// Языки: код, самоназвание; ru — исходный
const LANGS = [
  ['ru', 'Русский'], ['en', 'English'], ['uk', 'Українська'], ['es', 'Español'], ['pt', 'Português'], ['de', 'Deutsch'], ['fr', 'Français'],
  ['it', 'Italiano'], ['pl', 'Polski'], ['tr', 'Türkçe'], ['id', 'Bahasa Indonesia'], ['ja', '日本語'], ['ko', '한국어'], ['zh', '简体中文'],
];
module.exports = { scan, id, LANGS };

// node tools/i18n.js — обновить i18n/ru.json и показать, сколько строк не переведено в каждом языке
if (require.main === module) {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const lits = scan(fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8'));
  const ru = {};
  for (const l of lits) { const k = id(l.value); if (ru[k] !== undefined && ru[k] !== l.value) throw new Error('совпали id: ' + k); ru[k] = l.value; }
  fs.writeFileSync(path.join(root, 'i18n', 'ru.json'), JSON.stringify(ru, null, 1) + '\n');
  console.log('строк с кириллицей: ' + lits.length + ', разных: ' + Object.keys(ru).length);
  for (const [code] of LANGS.slice(1)) {
    const f = path.join(root, 'i18n', code + '.json');
    const tr = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const miss = Object.keys(ru).filter((k) => !tr[k]).length, extra = Object.keys(tr).filter((k) => k !== 'title' && !(k in ru)).length;
    console.log(code + ': не переведено ' + miss + (extra ? ', лишних ' + extra : ''));
  }
}
