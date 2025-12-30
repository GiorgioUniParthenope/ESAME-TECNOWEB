/* static/js/common.js */

$(function() {
    initNavbar();
});

function initNavbar() {
    const token = localStorage.getItem('jwt_token');
    const userDataStr = localStorage.getItem('user_data');
    
    const userSection = $('#nav-user-section');

    // 1. Check se utente è loggato
    if (token && userDataStr) {
        try {
            const user = JSON.parse(userDataStr);

            // Popola i dati nella UI
            // Iniziale
            const initial = user.nome ? user.nome.charAt(0).toUpperCase() : 'U';
            $('#header-initial').text(initial);

            // Nome
            $('#header-fullname').text(user.nome || 'Utente');
            
            // Email
            $('#header-email').text(user.email || '');

            // Ruolo (ID hardcodato dal tuo esempio precedente)
            const ADMIN_ROLE_ID = 'dcd2d41b-53a6-45d3-9f1a-a2fbef4ad001';
            const roleName = (user.ruolo_id === ADMIN_ROLE_ID) ? 'Amministratore' : 'Utente Standard';
            $('#header-role').val(roleName);

            // Mostra UI Utente, Nascondi Ospite
            userSection.removeClass('d-none');

            // Binding Logout
            $('#header-btn-logout').on('click', function(e) {
                e.preventDefault();
                logout();
            });

        } catch (e) {
            console.error("Errore parsing dati utente:", e);
            // Fallback: mostra ospite se i dati sono corrotti
            userSection.addClass('d-none');
        }
    } else {
        // Utente NON loggato
        userSection.addClass('d-none');
    }
}

function logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
}