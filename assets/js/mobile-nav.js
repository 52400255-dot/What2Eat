(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav.navbar.navbar-expand-lg.w2e-navbar').forEach((navbar) => {
      const toggle = navbar.querySelector('.navbar-toggler');
      const menu = navbar.querySelector('.navbar-collapse');
      if (!toggle || !menu || !window.bootstrap?.Collapse) return;

      toggle.setAttribute('aria-controls', menu.id);
      toggle.setAttribute('aria-expanded', 'false');
      const textLabel = toggle.querySelector('span:not(.navbar-toggler-icon)');
      const hasTextLabel = textLabel?.textContent.trim() === 'Menu' || toggle.textContent.trim() === 'Menu';
      const updateToggle = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
        if (hasTextLabel) {
          if (textLabel) textLabel.textContent = open ? 'Đóng' : 'Menu';
          else toggle.textContent = open ? 'Đóng' : 'Menu';
        }
      };
      const collapse = bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false });
      menu.addEventListener('shown.bs.collapse', () => updateToggle(true));
      menu.addEventListener('hidden.bs.collapse', () => updateToggle(false));
      menu.querySelectorAll('a[href]').forEach((link) => link.addEventListener('click', () => collapse.hide()));
      document.addEventListener('click', (event) => {
        if (menu.classList.contains('show') && !navbar.contains(event.target)) collapse.hide();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('show')) {
          collapse.hide();
          toggle.focus();
        }
      });
      window.matchMedia('(min-width: 992px)').addEventListener('change', (event) => {
        if (event.matches && menu.classList.contains('show')) collapse.hide();
      });
    });
  });
})();
