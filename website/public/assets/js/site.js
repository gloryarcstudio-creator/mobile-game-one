// Language switch (EN / RU). The first choice comes from the browser, then the visitor's own pick is remembered.
(function () {
  var root = document.documentElement;
  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var t = root.getAttribute('data-title-' + lang);
    if (t) document.title = t;
    var btns = document.querySelectorAll('.lang');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = lang === 'ru' ? 'EN' : 'RU';
      btns[i].setAttribute('aria-label', lang === 'ru' ? 'Switch to English' : 'Переключить на русский');
    }
  }
  var saved = null;
  try { saved = localStorage.getItem('pg-lang'); } catch (e) {}
  var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var lang = saved || (/^(ru|uk|be|kk)$/.test(nav) ? 'ru' : 'en');
  root.setAttribute('data-lang', lang);
  document.addEventListener('DOMContentLoaded', function () {
    apply(lang);
    var btns = document.querySelectorAll('.lang');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        lang = lang === 'ru' ? 'en' : 'ru';
        try { localStorage.setItem('pg-lang', lang); } catch (e) {}
        apply(lang);
      });
    }
    var y = document.querySelectorAll('[data-year]');
    for (var j = 0; j < y.length; j++) y[j].textContent = new Date().getFullYear();
  });
})();
