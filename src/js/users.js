// src/js/users.js
import { getCurrentUser, protectRoute } from './auth.js';
import { fetchData, createData, updateData, deleteData } from './api.js';
import { showSuccessToast, showErrorAlert, showConfirmationDialog } from './alerts.js';
import { navigateTo } from './router.js';

export const initUsers = async () => {
    // Solo workers pueden acceder
    if (!protectRoute(2)) return;
    
    const users = await fetchData('/users?_expand=role');
    renderUsers(users);
    setupEventListeners();
};

const renderUsers = (users) => {
    const container = document.getElementById('users-list');
    container.innerHTML = '';
    
    users.forEach(user => {
        const userRow = document.createElement('tr');
        userRow.dataset.id = user.id;
        userRow.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role.name}</td>
            <td class="actions">
                <button class="btn-edit">Editar</button>
                <button class="btn-delete">Eliminar</button>
            </td>
        `;
        container.appendChild(userRow);
    });
};

const setupEventListeners = () => {
    // Botón para agregar usuario
    document.getElementById('add-user').addEventListener('click', showUserForm);
    
    // Delegación de eventos para acciones en usuarios
    document.getElementById('users-list').addEventListener('click', (e) => {
        const userRow = e.target.closest('tr');
        if (!userRow) return;
        
        const userId = userRow.dataset.id;
        
        if (e.target.classList.contains('btn-edit')) {
            editUser(userId);
        } else if (e.target.classList.contains('btn-delete')) {
            deleteUser(userId);
        }
    });
    
    // Formulario de usuario
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
};

const showUserForm = async (user = null) => {
    const modal = document.getElementById('user-form-modal');
    const form = document.getElementById('user-form');
    const title = document.getElementById('user-form-title');
    
    if (user) {
        title.setAttribute('data-i18n', 'edit_user');
        form.elements['user-id'].value = user.id;
        form.elements['user-name'].value = user.name;
        form.elements['user-email'].value = user.email;
        form.elements['user-role'].value = user.roleId;
        form.elements['user-password'].required = false;
        form.elements['user-confirm-password'].required = false;
    } else {
        title.setAttribute('data-i18n', 'add_user');
        form.reset();
    }
    
    modal.classList.remove('hidden');
};

const editUser = async (userId) => {
    const user = await fetchData(`/users/${userId}`);
    if (user) {
        showUserForm(user);
    }
};

const deleteUser = async (userId) => {
    const currentUser = getCurrentUser();
    
    // Evitar que un usuario se elimine a sí mismo
    if (parseInt(userId) === currentUser.id) {
        showErrorAlert(i18next.t('error'), i18next.t('cannot_delete_yourself'));
        return;
    }
    
    const confirmation = await showConfirmationDialog(
        i18next.t('confirm_delete_title'),
        i18next.t('confirm_delete_user_text'),
        i18next.t('delete'),
        i18next.t('cancel')
    );
    
    if (confirmation.isConfirmed) {
        const success = await deleteData('/users', userId);
        if (success) {
            showSuccessToast(i18next.t('user_deleted'));
            initUsers();
        }
    }
};

const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const userId = form.elements['user-id'].value;
    
    // Validar contraseñas
    if (form.elements['user-password'].value !== form.elements['user-confirm-password'].value) {
        showErrorAlert(i18next.t('error'), i18next.t('passwords_mismatch'));
        return;
    }
    
    const userData = {
        name: form.elements['user-name'].value,
        email: form.elements['user-email'].value,
        roleId: parseInt(form.elements['user-role'].value),
        password: form.elements['user-password'].value
    };
    
    // Si estamos editando y no se cambió la contraseña, no la enviamos
    if (userId && !userData.password) {
        delete userData.password;
    }
    
    try {
        if (userId) {
            // Actualizar usuario existente
            await updateData('/users', userId, userData);
            showSuccessToast(i18next.t('user_updated'));
        } else {
            // Crear nuevo usuario
            await createData('/users', userData);
            showSuccessToast(i18next.t('user_created'));
        }
        
        // Cerrar modal y recargar vista
        document.getElementById('user-form-modal').classList.add('hidden');
        initUsers();
    } catch (error) {
        showErrorAlert(i18next.t('error'), i18next.t('operation_failed'));
    }
};