import i18next from 'i18next';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to Pet Paradise",
      login: "Login",
      register: "Register",
      // ... +50 traducciones
    }
  },
  es: {
    translation: {
      welcome: "Bienvenido a Paraíso Mascotas",
      login: "Iniciar sesión",
      register: "Registrarse",
      // ... +50 traducciones
    }
  }
};

export const initI18n = () => {
  i18next.init({
    lng: localStorage.getItem('lang') || 'es',
    resources,
    interpolation: {
      escapeValue: false
    }
  });
  
  updateTextElements();
};

export const changeLanguage = (lng) => {
  i18next.changeLanguage(lng);
  localStorage.setItem('lang', lng);
  updateTextElements();
};

const updateTextElements = () => {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = i18next.t(key);
  });
};

// Para usar en JS: i18next.t('key')