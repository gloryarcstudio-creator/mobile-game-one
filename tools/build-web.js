// Собирает игру в один HTML-файл: www/index.html (для Capacitor) и dist/cat-exorcist.html (для отправки).
// Запуск: node tools/build-web.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// картинки из art/ встраиваем как data: URI, чтобы один файл работал без сети
const js = fs.readFileSync(path.join(root, 'src', 'game.js'), 'utf8')
  .replace(/'art\/([\w.-]+)\.(png|webp)'/g, (m, f, ext) => "'data:image/" + ext + ";base64," + fs.readFileSync(path.join(root, 'art', f + '.' + ext)).toString('base64') + "'");
const tag = '<script src="src/game.js"></script>';
if (!html.includes(tag)) throw new Error('index.html: не найден тег ' + tag);
// шрифты встраиваем как data: URI, чтобы один файл работал без сети и внутри приложения
const fontUri = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');
const htmlFonts = html.replace(/url\(fonts\/([\w.-]+\.woff2)\)/g, (m, f) => 'url(' + fontUri(f) + ')');
// функция вместо строки: в коде игры есть «$», который replace иначе понял бы как шаблон
const single = htmlFonts.replace(tag, () => '<script>\n' + js + '\n</script>');

for (const [dir, name] of [['www', 'index.html'], ['dist', 'cat-exorcist.html']]) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, dir, name), single);
  console.log('→ ' + dir + '/' + name + ' (' + Math.round(single.length / 1024) + ' КБ)');
}
