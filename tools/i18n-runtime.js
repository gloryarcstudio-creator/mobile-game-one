// Язык игры: выбранный в настройках, иначе язык телефона, иначе английский. Смена языка перезапускает страницу.
(function () {
  var codes = window.LANGS.map(function (l) { return l[0]; }), lang = null;
  try { lang = localStorage.getItem('cat-exorcist-lang'); } catch (e) {}
  if (codes.indexOf(lang) < 0) {
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase(), base = nav.split('-')[0];
    if (base === 'in') base = 'id';
    if (['be', 'kk', 'ky', 'tg'].indexOf(base) >= 0) base = 'ru';
    lang = codes.indexOf(base) >= 0 ? base : 'en';
  }
  var D = window.I18N[lang] || {};
  window.LANG = lang;
  window.L = function (k, ru) { return D[k] || ru; };
  document.documentElement.lang = lang;
  if (lang !== 'ru' && D.title) document.title = D.title;
})();
