const API_BASE = '/api/v1';

function getToken() {
  return sessionStorage.getItem('turimiquire_token') || localStorage.getItem('turimiquire_token') || '';
}

function storeToken(token, remember) {
  sessionStorage.removeItem('turimiquire_token');
  localStorage.removeItem('turimiquire_token');
  (remember ? localStorage : sessionStorage).setItem('turimiquire_token', token);
}

function clearSession() {
  sessionStorage.removeItem('turimiquire_token');
  localStorage.removeItem('turimiquire_token');
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, {...options, headers});
  let data = null;
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => '');
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const message = data?.error || data?.message || (typeof data === 'string' && data) || `Error HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function requireSession() {
  if (!getToken()) {
    window.location.replace('/');
    throw new Error('Sesión requerida');
  }
  try {
    return await apiFetch('/security/me');
  } catch (error) {
    if (error.status === 401) window.location.replace('/');
    throw error;
  }
}

function logout() {
  clearSession();
  window.location.replace('/');
}

function hasPermission(profile, permission) {
  return Array.isArray(profile?.permissions) && profile.permissions.includes(permission);
}

const ROLE_LABELS = {
  ADMIN_PLATFORM: 'Administrador de plataforma',
  DBA: 'Administrador de base de datos (DBA)',
  DEVELOPER: 'Desarrollador institucional',
  AUDITOR: 'Responsable de seguridad / auditor',
  ANALYST: 'Analista autorizado',
  SERVICE_ACCOUNT: 'Cuenta de servicio'
};

function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Perfil sin identificar';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-VE', {dateStyle: 'medium', timeStyle: 'short'}).format(date);
}

function escapeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupMobileMenu() {
  document.querySelector('[data-mobile-menu]')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
    if (window.innerWidth <= 820) document.querySelector('.sidebar')?.classList.remove('open');
  }));
}
