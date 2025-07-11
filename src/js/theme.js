export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
};

export const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

export const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
};