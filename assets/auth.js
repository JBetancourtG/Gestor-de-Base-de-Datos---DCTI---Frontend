const API_BASE = 'http://localhost:8080/v1'; // CORRECCIÓN: Ruta absoluta a tu Motor Go

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
    
    // --- NUEVO SÚPER DETECTOR DE ERRORES ---
    let message = `Error HTTP ${response.status}`;
    if (data) {
        if (data.message) {
            message = data.message; // Captura errores de gRPC-Gateway
        } else if (data.error) {
            message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (typeof data === 'string' && data.trim() !== '') {
            message = data; // Captura errores en texto plano
        }
    }
    
    const error = new Error(message);
    error.status = response.status;
    error.raw = data; // Guardamos las tripas del error por si acaso
    throw error;
  }
  return data;
}

async function requireSession() {
  const token = getToken();
  if (!token) {
    window.location.replace('/');
    throw new Error('Sesión requerida');
  }
  try {
    // CORRECCIÓN: Llamamos a la ruta gRPC real diseñada por Luis
    const data = await apiFetch('/seguridad/validar-token', {
        method: 'POST',
        body: JSON.stringify({ token: token })
    });

    // Soporte para CamelCase o SnakeCase según cómo responda Go
    const esValido = data.esValido !== undefined ? data.esValido : data.es_valido;
    const rol = data.rol || data.role || 'ADMIN_PLATFORM';

    if (!esValido && !data.username) {
        throw new Error('Token expirado o inválido');
    }

    // CORRECCIÓN: Mapeamos el Rol a Permisos visuales para encender los botones de la UI
 // CORRECCIÓN: Matriz oficial de RBAC dictada por el diseño del Backend
 // CORRECCIÓN: Fusión de la Matriz de Lucho (Backend) + Permisos Visuales (Frontend)
    const permissionMap = {
      'ADMIN_PLATFORM': [
          // Poderes reales del servidor (Lucho)
          'catalogos:escribir', 'catalogos:leer', 'datasets:leer', 'colecciones:crear', 'colecciones:leer', 'colecciones:actualizar', 'colecciones:eliminar', 'auditoria:leer', 'respaldo:ejecutar', 'restauracion:ejecutar', 'usuarios:leer', 'usuarios:admin',
          // Poderes visuales de la interfaz (Nuestro Frontend)
          'conexiones:leer', 'conexiones:administrar', 'designer:validar', 'designer:aplicar', 'apis:consultar', 'apis:publicar', 'usuarios:directorio'
      ],
      'DBA': [
          'respaldo:ejecutar', 'restauracion:ejecutar', 'usuarios:leer', 'auditoria:leer',
          'conexiones:leer', 'designer:validar', 'designer:aplicar', 'apis:consultar'
      ],
      'DEVELOPER': [
          'catalogos:leer', 'catalogos:escribir', 'datasets:leer', 'colecciones:crear', 'colecciones:leer', 'colecciones:actualizar',
          'conexiones:leer', 'designer:validar', 'apis:consultar'
      ],
      'AUDITOR': [
          'auditoria:leer', 'catalogos:leer',
          'apis:consultar'
      ],
      'ANALYST': [
          'catalogos:leer', 'datasets:leer', 'colecciones:leer'
      ],
      'SERVICE_ACCOUNT': [
          'catalogos:leer', 'datasets:leer'
      ]
    };

    return {
      username: data.username || data.usuario_id || 'Usuario',
      role: rol,
      permissions: permissionMap[rol] || []
    };

  } catch (error) {
    clearSession();
    window.location.replace('/');
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
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 820) document.querySelector('.sidebar')?.classList.remove('open');
    });
  });
}