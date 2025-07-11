// src/js/alerts.js
import Swal from 'sweetalert2';

// Configuración base para toasts
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

// Alertas de éxito (toast)
export const showSuccessToast = (title) => {
    Toast.fire({
        icon: 'success',
        title: title
    });
};

// Alertas de error (modal)
export const showErrorAlert = (title, text) => {
    Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        footer: '<a href="#" data-i18n="why_this_happens">¿Por qué ocurre esto?</a>'
    });
};

// Alerta de confirmación
export const showConfirmationDialog = (title, text, confirmButtonText, cancelButtonText) => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4e54c8',
        cancelButtonColor: '#d33',
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText
    });
};

// Alerta de carga
export const showLoadingAlert = (title) => {
    Swal.fire({
        title: title,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    return Swal; // Para poder cerrarlo después
};