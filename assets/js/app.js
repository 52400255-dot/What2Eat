/* ============================================================
   What2Eat - app.js
   Core shared utilities & UI components
   ============================================================ */

'use strict';

// ============================================================
// GLOBAL STATE
// ============================================================
const W2E = {
  favorites: getLS('w2e_favorites') || [],
  user: getLS('w2e_user') || { name: 'Nguyễn Văn An', avatar: null },
  toastTimeout: {},
  modalStack: [],
};

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
function getLS(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.warn('[W2E] getLS error:', e);
    return null;
  }
}

function setLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[W2E] setLS error:', e);
    return false;
  }
}

function removeLS(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================
// FORMAT CURRENCY VND
// ============================================================
function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatVNDShort(amount) {
  if (!amount || isNaN(amount)) return '—';
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + ' triệu';
  }
  if (amount >= 1_000) {
    return Math.round(amount / 1_000) + 'k';
  }
  return amount.toLocaleString('vi-VN') + 'đ';
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

/**
 * Hiển thị toast notification
 * @param {Object} options - { title, message, type: 'success'|'error'|'warning'|'info'|'default', duration }
 */
function showToast({ title = '', message = '', type = 'default', duration = 4000 } = {}) {
  let container = document.querySelector('.w2e-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'w2e-toast-container';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'bi-check-circle-fill',
    error:   'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill',
    default: 'bi-bell-fill',
  };

  const titleMap = {
    success: title || 'Thành công',
    error:   title || 'Có lỗi xảy ra',
    warning: title || 'Cảnh báo',
    info:    title || 'Thông tin',
    default: title || 'Thông báo',
  };

  const toastId = 'toast_' + Date.now();
  const toast = document.createElement('div');
  toast.className = `w2e-toast w2e-toast--${type}`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <div class="w2e-toast__icon">
      <i class="bi ${iconMap[type] || iconMap.default}"></i>
    </div>
    <div class="w2e-toast__content">
      <div class="w2e-toast__title">${titleMap[type]}</div>
      ${message ? `<div class="w2e-toast__message">${message}</div>` : ''}
    </div>
    <button class="w2e-toast__close" onclick="hideToast('${toastId}')" aria-label="Đóng">
      <i class="bi bi-x"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto dismiss
  if (duration > 0) {
    W2E.toastTimeout[toastId] = setTimeout(() => hideToast(toastId), duration);
  }

  return toastId;
}

function hideToast(toastId) {
  const toast = document.getElementById(toastId);
  if (!toast) return;
  if (W2E.toastTimeout[toastId]) {
    clearTimeout(W2E.toastTimeout[toastId]);
    delete W2E.toastTimeout[toastId];
  }
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

// Shorthand helpers
const toast = {
  success: (msg, title)  => showToast({ type: 'success', message: msg, title }),
  error:   (msg, title)  => showToast({ type: 'error',   message: msg, title }),
  warning: (msg, title)  => showToast({ type: 'warning', message: msg, title }),
  info:    (msg, title)  => showToast({ type: 'info',    message: msg, title }),
  show:    (msg, title)  => showToast({ type: 'default', message: msg, title }),
};

// ============================================================
// MODAL SYSTEM
// ============================================================

/**
 * Hiển thị modal
 * @param {string} modalId - ID của modal overlay element
 */
function showModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  W2E.modalStack.push(modalId);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideModal(modalId);
  }, { once: true });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      hideModal(modalId);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Focus first focusable element
  const focusable = overlay.querySelector('input, textarea, select, button:not(.w2e-modal__close), [tabindex="0"]');
  if (focusable) {
    setTimeout(() => focusable.focus(), 100);
  }
}

/**
 * Ẩn modal
 * @param {string} modalId
 */
function hideModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.remove('open');

  W2E.modalStack = W2E.modalStack.filter(id => id !== modalId);
  if (W2E.modalStack.length === 0) {
    document.body.style.overflow = '';
  }
}

/**
 * Tạo và hiển thị confirm dialog
 * @param {Object} options - { title, message, confirmText, cancelText, type, onConfirm }
 */
function showConfirm({ title = 'Xác nhận', message = '', confirmText = 'Xác nhận', cancelText = 'Hủy', type = 'danger', onConfirm = null } = {}) {
  let overlay = document.getElementById('w2e-confirm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'w2e-modal-overlay';
    overlay.id = 'w2e-confirm-overlay';
    overlay.innerHTML = `
      <div class="w2e-modal w2e-modal--sm">
        <div class="w2e-confirm-modal" id="w2e-confirm-body">
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const iconMap = { danger: 'bi-trash3-fill', warning: 'bi-exclamation-triangle-fill' };
  const confirmClass = type === 'danger' ? 'w2e-btn--danger' : 'w2e-btn--primary';

  document.getElementById('w2e-confirm-body').innerHTML = `
    <div class="w2e-confirm-modal__icon ${type}">
      <i class="bi ${iconMap[type] || 'bi-question-circle-fill'}"></i>
    </div>
    <div class="w2e-confirm-modal__title">${title}</div>
    <div class="w2e-confirm-modal__desc">${message}</div>
    <div class="w2e-confirm-modal__actions">
      <button class="w2e-btn w2e-btn--ghost" onclick="hideModal('w2e-confirm-overlay')">${cancelText}</button>
      <button class="w2e-btn ${confirmClass}" id="w2e-confirm-btn">${confirmText}</button>
    </div>
  `;

  document.getElementById('w2e-confirm-btn').addEventListener('click', () => {
    hideModal('w2e-confirm-overlay');
    if (typeof onConfirm === 'function') onConfirm();
  });

  showModal('w2e-confirm-overlay');
}

// ============================================================
// FAVORITE TOGGLE
// ============================================================

/**
 * Toggle trạng thái yêu thích
 * @param {string} id - ID của restaurant/note
 * @param {HTMLElement} btn - Nút heart button
 * @param {string} name - Tên để hiển thị toast
 */
function toggleFavorite(id, btn, name = '') {
  const favorites = getLS('w2e_favorites') || [];
  const idx = favorites.indexOf(id);

  if (idx === -1) {
    favorites.push(id);
    btn.classList.add('active');
    btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
    toast.success(`Đã thêm vào danh sách yêu thích${name ? ': ' + name : ''}!`);
  } else {
    favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="bi bi-heart"></i>';
    toast.info(`Đã xóa${name ? ' ' + name : ''} khỏi danh sách yêu thích.`);
  }

  setLS('w2e_favorites', favorites);
  W2E.favorites = favorites;

  // Heart animation
  btn.style.transform = 'scale(1.3)';
  setTimeout(() => {
    btn.style.transform = '';
    btn.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }, 150);
}

/**
 * Khởi tạo tất cả nút yêu thích trên trang
 */
function initFavoriteButtons() {
  const favorites = getLS('w2e_favorites') || [];

  document.querySelectorAll('[data-fav-id]').forEach(btn => {
    const id = btn.getAttribute('data-fav-id');
    const name = btn.getAttribute('data-fav-name') || '';

    // Set initial state
    if (favorites.includes(id)) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
    } else {
      btn.innerHTML = '<i class="bi bi-heart"></i>';
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(id, btn, name);
    });
  });
}

// ============================================================
// NAVBAR SCROLL EFFECT
// ============================================================
function initNavbarScroll() {
  const navbar = document.querySelector('.w2e-navbar');
  if (!navbar) return;

  let lastScrollY = window.scrollY;

  const handleScroll = () => {
    const currentY = window.scrollY;
    if (currentY > 40) {
      navbar.classList.add('w2e-navbar--scrolled');
    } else {
      navbar.classList.remove('w2e-navbar--scrolled');
    }
    lastScrollY = currentY;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check
}

// ============================================================
// MOBILE NAVBAR TOGGLE
// ============================================================
function initMobileNavbarToggle() {
  const toggle = document.querySelector('.w2e-navbar__toggle');
  const menu = document.querySelector('.w2e-navbar__menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.innerHTML = isOpen
      ? '<i class="bi bi-x-lg"></i>'
      : '<i class="bi bi-list"></i>';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('open');
      toggle.innerHTML = '<i class="bi bi-list"></i>';
    }
  });
}

// ============================================================
// DROPDOWN MENU
// ============================================================
function initDropdowns() {
  document.querySelectorAll('.w2e-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');

      // Close others
      document.querySelectorAll('.w2e-dropdown.open').forEach(other => {
        if (other !== dropdown) other.classList.remove('open');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.w2e-dropdown.open').forEach(d => d.classList.remove('open'));
  });
}

// ============================================================
// BOTTOM NAV ACTIVE STATE
// ============================================================
function initBottomNav() {
  const bottomNav = document.querySelector('.w2e-bottom-nav');
  if (!bottomNav) return;

  const currentPath = window.location.pathname;
  bottomNav.querySelectorAll('.w2e-bottom-nav__item').forEach(item => {
    const href = item.getAttribute('href') || item.getAttribute('data-href') || '';
    if (href && currentPath.includes(href.replace('../', '').replace('./', ''))) {
      item.classList.add('active');
    }
  });
}

// ============================================================
// FORM VALIDATION HELPERS
// ============================================================
const validate = {
  /**
   * Kiểm tra required field
   */
  required(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  },

  /**
   * Kiểm tra email
   */
  email(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  },

  /**
   * Kiểm tra số điện thoại VN
   */
  phone(value) {
    return /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-9]|9[0-9])[0-9]{7}$/.test(String(value).trim());
  },

  /**
   * Kiểm tra min length
   */
  minLength(value, min) {
    return String(value).trim().length >= min;
  },

  /**
   * Kiểm tra max length
   */
  maxLength(value, max) {
    return String(value).trim().length <= max;
  },

  /**
   * Kiểm tra số
   */
  numeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  /**
   * Kiểm tra URL
   */
  url(value) {
    try {
      new URL(String(value));
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Validate một form element và hiển thị error
 * @param {HTMLInputElement} input
 * @param {string} message - Error message
 * @param {boolean} valid
 */
function setFieldError(input, message, valid) {
  const group = input.closest('.w2e-form-group');
  input.classList.toggle('is-invalid', !valid);
  input.classList.toggle('is-valid', valid);

  if (group) {
    let hint = group.querySelector('.w2e-form-text.error');
    if (!valid) {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'w2e-form-text error';
        group.appendChild(hint);
      }
      hint.textContent = message;
    } else {
      if (hint) hint.remove();
    }
  }
  return valid;
}

/**
 * Validate toàn bộ form
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateForm(form) {
  let isValid = true;

  form.querySelectorAll('[data-validate]').forEach(input => {
    const rules = input.getAttribute('data-validate').split('|');
    let fieldValid = true;
    let errorMsg = '';

    rules.forEach(rule => {
      if (!fieldValid) return;
      const [ruleName, ruleArg] = rule.split(':');

      switch (ruleName) {
        case 'required':
          fieldValid = validate.required(input.value);
          errorMsg = `${input.getAttribute('data-label') || 'Trường này'} không được để trống.`;
          break;
        case 'email':
          fieldValid = !input.value || validate.email(input.value);
          errorMsg = 'Email không đúng định dạng.';
          break;
        case 'phone':
          fieldValid = !input.value || validate.phone(input.value);
          errorMsg = 'Số điện thoại không hợp lệ (10 số, bắt đầu 0).';
          break;
        case 'minLength':
          fieldValid = !input.value || validate.minLength(input.value, parseInt(ruleArg));
          errorMsg = `Tối thiểu ${ruleArg} ký tự.`;
          break;
        case 'maxLength':
          fieldValid = !input.value || validate.maxLength(input.value, parseInt(ruleArg));
          errorMsg = `Tối đa ${ruleArg} ký tự.`;
          break;
        case 'numeric':
          fieldValid = !input.value || validate.numeric(input.value);
          errorMsg = 'Vui lòng nhập số hợp lệ.';
          break;
      }
    });

    setFieldError(input, errorMsg, fieldValid);
    if (!fieldValid) isValid = false;
  });

  return isValid;
}

// ============================================================
// INITIAL-LETTER MONOGRAM
// ============================================================
// ------------------------------------------------------------
// Initial-letter monogram. Replaces the decorative emoji that
// used to sit in category tiles and the picker wheel: a single
// letter carries the same orientation cue without the noise.
// ------------------------------------------------------------
function initialLetter(value) {
  const text = String(value || '').replace(/^[^\p{L}\p{N}]+/u, '');
  const point = Array.from(text)[0];
  return point ? point.toUpperCase() : '•';
}
// ============================================================
// RATING STARS RENDERER
// ============================================================

/**
 * Render sao rating tĩnh
 * @param {number} rating - 0-5
 * @param {boolean} showNumber - Hiển thị số kèm theo
 * @returns {string} HTML string
 */
function renderStars(rating, showNumber = false) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  let html = '<span class="w2e-stars">';
  for (let i = 0; i < full;  i++) html += '<i class="bi bi-star-fill"></i>';
  for (let i = 0; i < half;  i++) html += '<i class="bi bi-star-half"></i>';
  for (let i = 0; i < empty; i++) html += '<i class="bi bi-star w2e-star-empty"></i>';
  html += '</span>';

  if (showNumber) {
    html += `<span class="w2e-stars__value">${rating.toFixed(1)}</span>`;
  }
  return html;
}

// ============================================================
// SKELETON LOADING TOGGLE
// ============================================================

/**
 * Hiển thị hoặc ẩn skeleton loading
 * @param {string} containerId - ID của container
 * @param {boolean} show
 */
function toggleSkeleton(containerId, show) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletonEl = container.querySelector('.w2e-skeleton-wrapper');
  const contentEl  = container.querySelector('.w2e-content-wrapper');

  if (skeletonEl) skeletonEl.style.display = show ? 'block' : 'none';
  if (contentEl)  contentEl.style.display  = show ? 'none'  : 'block';
}

/**
 * Tạo skeleton card HTML
 * @param {number} count - Số card
 * @param {string} type - 'restaurant' | 'note'
 * @returns {string}
 */
function createSkeletonCards(count = 6, type = 'restaurant') {
  let html = '';
  for (let i = 0; i < count; i++) {
    if (type === 'restaurant') {
      html += `
        <div class="w2e-skeleton-card">
          <div class="w2e-skeleton-img"></div>
          <div class="w2e-skeleton-body">
            <div class="w2e-skeleton-line medium"></div>
            <div class="w2e-skeleton-line short" style="margin-top:8px"></div>
            <div class="w2e-skeleton-line full" style="margin-top:12px"></div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="w2e-skeleton-card">
          <div class="w2e-skeleton-img" style="height:160px"></div>
          <div class="w2e-skeleton-body">
            <div class="w2e-skeleton-line short thin"></div>
            <div class="w2e-skeleton-line medium" style="margin-top:8px"></div>
            <div class="w2e-skeleton-line full thin" style="margin-top:8px"></div>
            <div class="w2e-skeleton-line full thin"></div>
          </div>
        </div>
      `;
    }
  }
  return html;
}

// ============================================================
// IMAGE UPLOAD PREVIEW
// ============================================================
function initImageUpload() {
  document.querySelectorAll('.w2e-upload-area').forEach(area => {
    const input = area.querySelector('input[type="file"]');
    const preview = area.parentElement.querySelector('.w2e-img-preview-list');
    if (!input) return;

    area.addEventListener('click', () => input.click());

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag-over');
    });

    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        handleImageFiles(e.dataTransfer.files, preview);
      }
    });

    input.addEventListener('change', () => {
      handleImageFiles(input.files, preview);
    });
  });
}

function handleImageFiles(files, previewContainer) {
  if (!previewContainer) return;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = document.createElement('div');
      item.className = 'w2e-img-preview-item';
      item.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="w2e-img-preview-item__remove" onclick="this.parentElement.remove()" title="Xóa">
          <i class="bi bi-x"></i>
        </button>
      `;
      previewContainer.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// TAG INPUT SYSTEM
// ============================================================
function initTagInputs() {
  document.querySelectorAll('.w2e-tag-input').forEach(wrapper => {
    const input = wrapper.querySelector('input');
    if (!input) return;

    const addTag = (val) => {
      const text = val.trim();
      if (!text || text.length > 30) return;

      // Check duplicate
      const existing = Array.from(wrapper.querySelectorAll('.w2e-tag-input__tag span')).map(s => s.textContent);
      if (existing.includes(text)) {
        toast.warning('Tag này đã tồn tại!');
        return;
      }

      const tag = document.createElement('span');
      tag.className = 'w2e-tag-input__tag';
      tag.innerHTML = `<span>${text}</span><button type="button" onclick="this.parentElement.remove()" aria-label="Xóa tag">×</button>`;
      wrapper.insertBefore(tag, input);
    };

    input.addEventListener('keydown', (e) => {
      if (['Enter', ',', 'Tab'].includes(e.key)) {
        e.preventDefault();
        if (input.value.trim()) {
          addTag(input.value);
          input.value = '';
        }
      }
      if (e.key === 'Backspace' && !input.value) {
        const tags = wrapper.querySelectorAll('.w2e-tag-input__tag');
        if (tags.length) tags[tags.length - 1].remove();
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        addTag(input.value);
        input.value = '';
      }
    });
  });
}

// ============================================================
// STAR RATING INPUT
// ============================================================
function initStarRatingInputs() {
  document.querySelectorAll('.w2e-star-rating').forEach(wrapper => {
    const inputs = wrapper.querySelectorAll('input[type="radio"]');
    const hiddenInput = wrapper.parentElement.querySelector('input[type="hidden"][data-star-value]');

    inputs.forEach(input => {
      input.addEventListener('change', () => {
        if (hiddenInput) hiddenInput.value = input.value;
        wrapper.setAttribute('data-current-rating', input.value);
      });
    });
  });
}

// ============================================================
// AUTOSAVE DRAFT TO LOCALSTORAGE
// ============================================================
function initAutosave(formId, storageKey, interval = 3000) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Restore draft
  const draft = getLS(storageKey);
  if (draft) {
    Object.entries(draft).forEach(([name, value]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (field && field.type !== 'file') field.value = value;
    });

    const banner = document.createElement('div');
    banner.className = 'w2e-draft-banner';
    banner.style.cssText = 'padding:.625rem 1rem;background:#FEF3DC;border-radius:8px;font-size:.8rem;color:#B8861B;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;';
    banner.innerHTML = `<i class="bi bi-clock-history"></i> Đã khôi phục bản nháp. <button onclick="clearDraft('${storageKey}', this.parentElement)" style="margin-left:auto;background:none;border:none;color:#B8861B;cursor:pointer;font-weight:600;">Xóa nháp</button>`;
    form.prepend(banner);
  }

  // Save draft periodically
  let saveTimer;
  form.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = {};
      new FormData(form).forEach((val, key) => {
        if (typeof val === 'string') data[key] = val;
      });
      setLS(storageKey, data);
    }, interval);
  });

  // Clear draft on submit
  form.addEventListener('submit', () => removeLS(storageKey));
}

function clearDraft(storageKey, banner) {
  removeLS(storageKey);
  if (banner) banner.remove();
  toast.info('Đã xóa bản nháp.');
}

// ============================================================
// SMOOTH SCROLL TO SECTION
// ============================================================
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  const offset = 80;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ============================================================
// COPY TO CLIPBOARD
// ============================================================
async function copyToClipboard(text, successMsg = 'Đã sao chép!') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMsg);
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast.success(successMsg);
  }
}

// ============================================================
// LAZY LOAD IMAGES
// ============================================================
function initLazyImages() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });

    imgs.forEach(img => observer.observe(img));
  } else {
    imgs.forEach(img => {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    });
  }
}

// ============================================================
// READING TIME ESTIMATOR
// ============================================================
function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return minutes <= 1 ? '1 phút đọc' : `${minutes} phút đọc`;
}

// ============================================================
// DATE FORMATTERS (Vietnamese)
// ============================================================
function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTimeVN(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;
  return `${Math.floor(diff / 31536000)} năm trước`;
}

// ============================================================
// DEBOUNCE & THROTTLE
// ============================================================
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit = 100) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= limit) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// ============================================================
// RANDOM PICKER ANIMATION
// ============================================================
function spinPicker(items, onResult, duration = 1500) {
  const wheel = document.querySelector('.w2e-picker__wheel');
  if (wheel) wheel.classList.add('spinning');

  // Rapid random display during spin
  let count = 0;
  const maxCount = Math.floor(duration / 80);
  const interval = setInterval(() => {
    count++;
    const randItem = items[Math.floor(Math.random() * items.length)];
    if (wheel) wheel.textContent = initialLetter(randItem.name || randItem.title || '');
    if (count >= maxCount) {
      clearInterval(interval);
      if (wheel) wheel.classList.remove('spinning');
      const result = items[Math.floor(Math.random() * items.length)];
      if (typeof onResult === 'function') onResult(result);
    }
  }, 80);
}

// ============================================================
// BACK TO TOP BUTTON
// ============================================================
function initBackToTop() {
  let btn = document.querySelector('.w2e-back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'w2e-back-to-top';
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btn.style.cssText = `
      position: fixed; bottom: 5rem; right: 1.5rem; z-index: 800;
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--primary); color: white; border: none;
      display: none; align-items: center; justify-content: center;
      font-size: 1.125rem; cursor: pointer; box-shadow: 0 4px 15px rgba(212,160,23,0.4);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(btn);
  }

  window.addEventListener('scroll', throttle(() => {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  }, 200));

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================================
// INIT ALL ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileNavbarToggle();
  initDropdowns();
  initFavoriteButtons();
  initBottomNav();
  initLazyImages();
  initImageUpload();
  initTagInputs();
  initStarRatingInputs();
  initBackToTop();

  // Set active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.w2e-navbar__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.endsWith(href.replace('./', '').replace('../', ''))) {
      link.classList.add('active');
    }
  });
});

// Expose to global
window.W2E = W2E;
window.showToast = showToast;
window.hideToast = hideToast;
window.toast = toast;
window.showModal = showModal;
window.hideModal = hideModal;
window.showConfirm = showConfirm;
window.toggleFavorite = toggleFavorite;
window.formatVND = formatVND;
window.formatVNDShort = formatVNDShort;
window.renderStars = renderStars;
window.toggleSkeleton = toggleSkeleton;
window.createSkeletonCards = createSkeletonCards;
window.getLS = getLS;
window.setLS = setLS;
window.removeLS = removeLS;
window.validate = validate;
window.validateForm = validateForm;
window.formatDateVN = formatDateVN;
window.formatDateTimeVN = formatDateTimeVN;
window.timeAgo = timeAgo;
window.debounce = debounce;
window.throttle = throttle;
window.spinPicker = spinPicker;
window.scrollToSection = scrollToSection;
window.copyToClipboard = copyToClipboard;
window.initAutosave = initAutosave;
window.clearDraft = clearDraft;
window.estimateReadingTime = estimateReadingTime;
