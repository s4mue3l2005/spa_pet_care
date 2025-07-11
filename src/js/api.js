const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
};

export const createData = async (endpoint, data) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const updateData = async (endpoint, id, data) => {
  const response = await fetch(`${API_BASE}${endpoint}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const deleteData = async (endpoint, id) => {
  const response = await fetch(`${API_BASE}${endpoint}/${id}`, {
    method: 'DELETE'
  });
  return response.ok;
};