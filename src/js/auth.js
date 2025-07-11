import { fetchData } from './api.js';
import { showSuccessToast } from './alerts.js';
import { navigateTo } from './router.js';

export const isAuthenticated = () => {
  return !!localStorage.getItem('currentUser');
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('currentUser'));
};

export const getUserRole = () => {
  const user = getCurrentUser();
  return user ? user.roleId : null;
};

export const login = async (email, password) => {
  const users = await fetchData('/users');
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    showSuccessToast('¡Bienvenido de vuelta!');
    navigateTo('/dashboard');
    return true;
  }
  return false;
};

export const register = async (userData) => {
  // Asignar rol de cliente por defecto
  userData.roleId = 1; 
  const newUser = await createData('/users', userData);
  
  if (newUser) {
    showSuccessToast('¡Registro exitoso!');
    navigateTo('/login');
    return true;
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem('currentUser');
  navigateTo('/login');
};

export const protectRoute = (requiredRole = null) => {
  if (!isAuthenticated()) {
    navigateTo('/login');
    return false;
  }
  
  if (requiredRole && getUserRole() !== requiredRole) {
    navigateTo('/dashboard');
    return false;
  }
  
  return true;
};