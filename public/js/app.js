// Mobile sidebar toggle
(function () {
  var btn = document.getElementById('menuToggle');
  var side = document.getElementById('sidebar');
  if (!btn || !side) return;
  btn.addEventListener('click', function () {
    side.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (side.classList.contains('open') && !side.contains(e.target) && !btn.contains(e.target)) {
      side.classList.remove('open');
    }
  });
})();
