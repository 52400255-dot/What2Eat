/* Google Identity Services login for the What2Eat PHP session API. */
(function () {
  'use strict';

  const mount = document.getElementById('googleSignInButton');
  if (!mount) return;

  const fallback = document.querySelector('.w2e-google-fallback');
  const status = document.getElementById('googleAuthStatus');
  let submitting = false;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function setUnavailable(message) {
    mount.hidden = true;
    if (fallback) fallback.hidden = false;
    setStatus(message);
  }

  async function getCsrfToken() {
    const response = await fetch('/api/v1/auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.csrf_token) {
      throw new Error(result.error || 'Phiên đăng nhập đã hết hạn. Hãy tải lại trang.');
    }
    return result.csrf_token;
  }

  function loginRedirect() {
    const next = new URLSearchParams(location.search).get('next');
    if (next) {
      try {
        const candidate = new URL(next, location.origin);
        if (candidate.origin === location.origin) return candidate.href;
      } catch (_) {}
    }
    return '../index.php';
  }

  async function handleCredential(response) {
    if (submitting) return;
    if (!response || typeof response.credential !== 'string' || !response.credential) {
      setStatus('Google chưa trả về thông tin đăng nhập. Hãy thử lại.');
      return;
    }

    submitting = true;
    if (mount) mount.setAttribute('aria-busy', 'true');
    if (fallback) fallback.disabled = true;
    setStatus('Đang xác minh tài khoản Google…');

    try {
      const csrfToken = await getCsrfToken();
      const result = await fetch('/api/v1/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ credential: response.credential }),
      });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(payload.error || 'Chưa thể đăng nhập bằng Google.');

      try {
        const remember = document.getElementById('rememberMe')?.checked;
        if (remember && payload.user?.email) localStorage.setItem('w2e_remember_email', payload.user.email);
        else localStorage.removeItem('w2e_remember_email');
      } catch (_) {}
      setStatus('Đăng nhập thành công. Đang chuyển trang…');
      location.replace(loginRedirect());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Chưa thể đăng nhập bằng Google. Hãy thử lại.');
      submitting = false;
      if (mount) mount.removeAttribute('aria-busy');
      if (fallback) fallback.disabled = false;
    }
  }

  function loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-w2e-google-gis]');
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      const script = existing || document.createElement('script');
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.w2eGoogleGis = 'true';
      }
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Không tải được dịch vụ Google Identity Services.')), { once: true });
      if (!existing) document.head.appendChild(script);
    });
  }

  async function initialize() {
    try {
      const response = await fetch('/api/v1/site-info', { credentials: 'same-origin', cache: 'no-store' });
      const siteInfo = await response.json().catch(() => ({}));
      const clientId = typeof siteInfo.google_client_id === 'string' ? siteInfo.google_client_id.trim() : '';
      if (!response.ok || !clientId) {
        setUnavailable('Đăng nhập Google hiện chưa khả dụng.');
        return;
      }

      await loadGoogleIdentityServices();
      if (!window.google?.accounts?.id) throw new Error('Không tải được dịch vụ Google Identity Services.');
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      mount.hidden = false;
      window.google.accounts.id.renderButton(mount, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 360,
      });
      if (fallback) fallback.hidden = true;
      if (status) status.textContent = '';
    } catch (error) {
      setUnavailable(error instanceof Error ? error.message : 'Đăng nhập Google hiện chưa khả dụng.');
    }
  }

  initialize();
})();
