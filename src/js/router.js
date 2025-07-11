const routes = {
  '/': 'login',
  '/login': 'login',
  '/register': 'register',
  '/dashboard': 'dashboard',
  '/pets': 'pets',
  '/stays': 'stays',
  '/users': 'users'
};

export async function loadView() {
  const path = window.location.pathname;
  const viewName = routes[path] || '404';
  
  // Protección de rutas
  if (isProtectedRoute(path) && !isAuthenticated()) {
    navigateTo('/login');
    return;
  }

  try {
    const response = await fetch(`/views/${viewName}.html`);
    const html = await response.text();
    document.getElementById('app').innerHTML = html;
    
    // Cargar lógica JS específica
    if (viewName === 'dashboard') await initDashboard();
    if (viewName === 'pets') await initPets();
    if (viewName === 'stays') await initStays();
    if (viewName === 'users') await initUsers();
    
    // Actualizar navegación activa
    updateActiveNavLink(path);
    
  } catch (error) {
    document.getElementById('app').innerHTML = '<h1>404 - Página no encontrada</h1>';
  }
}

export function navigateTo(path) {
  window.history.pushState({}, '', path);
  loadView();
}

function isProtectedRoute(path) {
  const protectedRoutes = ['/dashboard', '/pets', '/stays', '/users'];
  return protectedRoutes.includes(path);
}

// Eventos de navegación
window.addEventListener('popstate', loadView);
document.addEventListener('click', e => {
  if (e.target.matches('[data-link]')) {
    e.preventDefault();
    navigateTo(e.target.href);
  }
});