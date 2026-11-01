// Собирает игру в один HTML-файл: www/index.html (для Capacitor) и dist/cat-exorcist.html (для отправки).
// Запуск: node tools/build-web.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8');
const tag = '<script src="src/game.js"></script>';
if (!html.includes(tag)) throw new Error('index.html: не найден тег ' + tag);
// функция вместо строки: в коде игры есть «$», который replace иначе понял бы как шаблон
const single = html.replace(tag, () => '<script>\n' + js + '\n</script>');

for (const [dir, name] of [['www', 'index.html'], ['dist', 'cat-exorcist.html']]) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, dir, name), single);
  console.log('→ ' + dir + '/' + name + ' (' + Math.round(single.length / 1024) + ' КБ)');
}
