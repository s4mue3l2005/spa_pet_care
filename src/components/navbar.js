export const renderNavbar = () => {
  const user = getCurrentUser();
  
  return `
    <nav>
      <a href="/dashboard" data-link>Dashboard</a>
      ${user ? `
        <a href="/pets" data-link>Mascotas</a>
        <a href="/stays" data-link>Estancias</a>
        ${user.roleId === 2 ? `<a href="/users" data-link>Usuarios</a>` : ''}
      ` : ''}
      
      <div class="nav-controls">
        <button id="theme-toggle">🌙</button>
        <select id="language-select">
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
        ${user ? `<button id="logout-btn">Cerrar sesión</button>` : ''}
      </div>
    </nav>
  `;
};

// Event listeners en main.js
document.body.addEventListener('click', (e) => {
  if (e.target.id === 'logout-btn') logout();
  if (e.target.id === 'theme-toggle') toggleTheme();
});

document.getElementById('language-select')?.addEventListener('change', (e) => {
  changeLanguage(e.target.value);
});