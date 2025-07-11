// src/js/stays.js
import { getCurrentUser, protectRoute } from './auth.js';
import { fetchData, createData, updateData, deleteData } from './api.js';
import { showSuccessToast, showErrorAlert, showConfirmationDialog } from './alerts.js';
import { navigateTo } from './router.js';

// Variables globales
let currentPets = [];

export const initStays = async () => {
    if (!protectRoute()) return;
    
    const currentUser = getCurrentUser();
    let stays = [];
    
    // Worker: Todas las estancias, Customer: Solo sus estancias
    if (currentUser.roleId === 2) {
        stays = await fetchData('/stays?_expand=pet&_expand=user');
    } else {
        stays = await fetchData(`/stays?userId=${currentUser.id}&_expand=pet&_expand=user`);
    }
    
    renderStays(stays);
    setupEventListeners();
    
    // Cargar mascotas para el formulario
    currentPets = await fetchData(`/pets?userId=${currentUser.id}`);
};

const renderStays = (stays) => {
    const container = document.getElementById('stays-container');
    container.innerHTML = '';
    
    stays.forEach(stay => {
        const startDate = new Date(stay.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + stay.duration);
        
        const stayCard = document.createElement('div');
        stayCard.className = 'card';
        stayCard.dataset.id = stay.id;
        stayCard.innerHTML = `
            <div class="card-header">
                <h3>${stay.pet.name}</h3>
                <span class="status-badge ${stay.status}">${stay.status === 'active' ? 'Activa' : 'Completada'}</span>
            </div>
            <div class="card-body">
                <p><strong>Dueño:</strong> ${stay.user.name}</p>
                <p><strong>Fecha inicio:</strong> ${startDate.toLocaleDateString()}</p>
                <p><strong>Fecha fin:</strong> ${endDate.toLocaleDateString()}</p>
                <p><strong>Duración:</strong> ${stay.duration} días</p>
                ${stay.specialNotes ? `<p><strong>Notas:</strong> ${stay.specialNotes}</p>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn-edit">Editar</button>
                <button class="btn-delete">Eliminar</button>
            </div>
        `;
        container.appendChild(stayCard);
    });
};

const setupEventListeners = () => {
    // Botón para agregar estancia
    document.getElementById('add-stay').addEventListener('click', showStayForm);
    
    // Filtro por estado
    document.getElementById('status-filter').addEventListener('change', async (e) => {
        const status = e.target.value;
        const currentUser = getCurrentUser();
        let url = '/stays?_expand=pet&_expand=user';
        
        if (currentUser.roleId !== 2) {
            url += `&userId=${currentUser.id}`;
        }
        
        if (status !== 'all') {
            url += `&status=${status}`;
        }
        
        const stays = await fetchData(url);
        renderStays(stays);
    });
    
    // Delegación de eventos para acciones en estancias
    document.getElementById('stays-container').addEventListener('click', (e) => {
        const stayCard = e.target.closest('.card');
        if (!stayCard) return;
        
        const stayId = stayCard.dataset.id;
        
        if (e.target.classList.contains('btn-edit')) {
            editStay(stayId);
        } else if (e.target.classList.contains('btn-delete')) {
            deleteStay(stayId);
        }
    });
    
    // Formulario de estancia
    document.getElementById('stay-form').addEventListener('submit', handleStaySubmit);
};

const showStayForm = async (stay = null) => {
    const modal = document.getElementById('stay-form-modal');
    const form = document.getElementById('stay-form');
    const title = document.getElementById('stay-form-title');
    
    if (stay) {
        title.setAttribute('data-i18n', 'edit_stay');
        form.elements['stay-id'].value = stay.id;
        form.elements['stay-pet'].value = stay.petId;
        form.elements['start-date'].value = stay.startDate;
        form.elements['duration'].value = stay.duration;
        form.elements['special-notes'].value = stay.specialNotes || '';
    } else {
        title.setAttribute('data-i18n', 'add_stay');
        form.reset();
    }
    
    // Cargar mascotas en el select
    const petSelect = document.getElementById('stay-pet');
    petSelect.innerHTML = '';
    
    currentPets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = pet.name;
        petSelect.appendChild(option);
    });
    
    modal.classList.remove('hidden');
};

const editStay = async (stayId) => {
    const stay = await fetchData(`/stays/${stayId}`);
    if (stay) {
        showStayForm(stay);
    }
};

const deleteStay = async (stayId) => {
    const confirmation = await showConfirmationDialog(
        i18next.t('confirm_delete_title'),
        i18next.t('confirm_delete_text'),
        i18next.t('delete'),
        i18next.t('cancel')
    );
    
    if (confirmation.isConfirmed) {
        const success = await deleteData('/stays', stayId);
        if (success) {
            showSuccessToast(i18next.t('stay_deleted'));
            initStays();
        }
    }
};

const handleStaySubmit = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const stayId = form.elements['stay-id'].value;
    const currentUser = getCurrentUser();
    
    const stayData = {
        petId: form.elements['stay-pet'].value,
        userId: currentUser.id,
        startDate: form.elements['start-date'].value,
        duration: form.elements['duration'].value,
        specialNotes: form.elements['special-notes'].value,
        status: 'active'
    };
    
    try {
        if (stayId) {
            // Actualizar estancia existente
            await updateData('/stays', stayId, stayData);
            showSuccessToast(i18next.t('stay_updated'));
        } else {
            // Crear nueva estancia
            await createData('/stays', stayData);
            showSuccessToast(i18next.t('stay_created'));
        }
        
        // Cerrar modal y recargar vista
        document.getElementById('stay-form-modal').classList.add('hidden');
        initStays();
    } catch (error) {
        showErrorAlert(i18next.t('error'), i18next.t('operation_failed'));
    }
};