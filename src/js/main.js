// src/js/main.js (actualizado)
import { loadView } from './router.js';
import { initI18n, changeLanguage } from './i18n.js';
import { initTheme, toggleTheme } from './theme.js';
import { getCurrentUser, logout } from './auth.js';
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js'; // Importamos el footer

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    // Renderizar navbar
    document.getElementById('navbar').innerHTML = renderNavbar();
    
    // Renderizar footer
    document.getElementById('footer').innerHTML = renderFooter();
    
    // Inicializar internacionalización
    await initI18n();
    
    // Inicializar tema
    initTheme();
    
    // Cargar vista inicial
    loadView();
    
    // Eventos globales
    document.body.addEventListener('click', (e) => {
        // Logout
        if (e.target.id === 'logout-btn') {
            logout();
        }
        
        // Cambio de tema
        if (e.target.id === 'theme-toggle') {
            toggleTheme();
        }
        
        // Cambio de idioma
        if (e.target.id === 'language-select') {
            changeLanguage(e.target.value);
        }
        
        // Cerrar modales
        if (e.target.classList.contains('close-modal')) {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
});

// Manejar navegación SPA
window.addEventListener('popstate', loadView);