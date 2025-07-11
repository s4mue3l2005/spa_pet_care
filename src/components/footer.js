// src/components/footer.js
import { getCurrentUser } from '../js/auth.js';

export const renderFooter = () => {
    const currentYear = new Date().getFullYear();
    const user = getCurrentUser();
    
    return `
        <footer class="main-footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3 data-i18n="about_us">Sobre nosotros</h3>
                    <p data-i18n="footer_description">Centro vacacional de lujo para mascotas con atención profesional las 24 horas.</p>
                </div>
                
                <div class="footer-section">
                    <h3 data-i18n="contact">Contacto</h3>
                    <p data-i18n="address">123 Calle Mascotas, Ciudad Animal</p>
                    <p data-i18n="phone">Tel: +1 234 567 890</p>
                    <p data-i18n="email">Email: info@petvacation.com</p>
                </div>
                
                <div class="footer-section">
                    <h3 data-i18n="quick_links">Enlaces rápidos</h3>
                    <ul>
                        <li><a href="/dashboard" data-link data-i18n="dashboard">Dashboard</a></li>
                        ${user ? `
                            <li><a href="/pets" data-link data-i18n="pets">Mascotas</a></li>
                            <li><a href="/stays" data-link data-i18n="stays">Estancias</a></li>
                        ` : `
                            <li><a href="/login" data-link data-i18n="login">Iniciar sesión</a></li>
                            <li><a href="/register" data-link data-i18n="register">Registrarse</a></li>
                        `}
                    </ul>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p data-i18n="copyright">&copy; ${currentYear} Pet Vacation Center. Todos los derechos reservados.</p>
                <div class="footer-links">
                    <a href="#" data-i18n="privacy_policy">Política de privacidad</a>
                    <a href="#" data-i18n="terms">Términos y condiciones</a>
                </div>
            </div>
        </footer>
    `;
};

// Para usar en main.js
// document.getElementById('footer').innerHTML = renderFooter();