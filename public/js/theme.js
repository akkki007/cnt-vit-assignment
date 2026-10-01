/* Three-state theme toggle (system → light → dark). Loaded in <head> so the saved theme applies before first paint. */
(function () {
  var KEY = 'vph-theme';
  var root = document.documentElement;

  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  function current() {
    var t = root.getAttribute('data-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  }

  function apply(next) {
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch (e) {}
    paint();
  }

  function paint() {
    var t = current();
    var icon = t === 'light' ? 'bi-sun' : t === 'dark' ? 'bi-moon' : 'bi-circle-half';
    var label = t === 'light' ? 'Theme: light (click for dark)' : t === 'dark' ? 'Theme: dark (click for system)' : 'Theme: system (click for light)';
    document.querySelectorAll('.js-theme-toggle').forEach(function (btn) {
      btn.innerHTML = '<i class="bi ' + icon + '"></i>';
      btn.setAttribute('title', label);
      btn.setAttribute('aria-label', label);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.js-theme-toggle');
    if (!btn) return;
    var t = current();
    apply(t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system');
  });

  document.addEventListener('DOMContentLoaded', paint);
})();
