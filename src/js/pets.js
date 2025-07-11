import { getCurrentUser, protectRoute } from './auth.js';
import { fetchData, deleteData } from './api.js';
import { showErrorAlert, showSuccessToast } from './alerts.js';

export const initPets = async () => {
  if (!protectRoute()) return;
  
  const currentUser = getCurrentUser();
  let pets = [];
  
  // Worker: Todas las mascotas, Customer: Solo sus mascotas
  if (currentUser.roleId === 2) {
    pets = await fetchData('/pets');
  } else {
    pets = await fetchData(`/pets?userId=${currentUser.id}`);
  }
  
  renderPets(pets);
  setupEventListeners();
};

const renderPets = (pets) => {
  const container = document.getElementById('pets-container');
  container.innerHTML = '';
  
  pets.forEach(pet => {
    const petElement = document.createElement('div');
    petElement.className = 'pet-card';
    petElement.dataset.id = pet.id;
    petElement.innerHTML = `
      <h3>${pet.name}</h3>
      <p>Tipo: ${pet.type}</p>
      <p>Raza: ${pet.breed}</p>
      <div class="pet-actions">
        <button class="btn-edit">Editar</button>
        <button class="btn-delete">Eliminar</button>
      </div>
    `;
    container.appendChild(petElement);
  });
};

const setupEventListeners = () => {
  document.getElementById('add-pet').addEventListener('click', showPetForm);
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', handleDeletePet);
  });
};

const handleDeletePet = async (e) => {
  const petId = e.target.closest('.pet-card').dataset.id;
  const stays = await fetchData(`/stays?petId=${petId}&status=active`);
  
  if (stays && stays.length > 0) {
    showErrorAlert(
      'No se puede eliminar',
      'Esta mascota tiene una estancia activa'
    );
    return;
  }
  
  if (await deleteData('/pets', petId)) {
    showSuccessToast('Mascota eliminada correctamente');
    initPets();
  }
};