// ==========================================
// INIT
// ==========================================

$(function() {
    initNavbar();
});

// ==========================================
// NAVBAR & SESSION LOGIC
// ==========================================

function initNavbar() {
    const token = localStorage.getItem('jwt_token');
    const userDataStr = localStorage.getItem('user_data');
    const userSection = $('#nav-user-section');

    // Fast fail: No session -> User UI remains hidden (default CSS)
    if (!token || !userDataStr) return;

    try {
        const user = JSON.parse(userDataStr);

        // --- UI POPULATION ---

        // Avatar (Initial or fallback)
        const initial = user.nome ? user.nome.charAt(0).toUpperCase() : 'U';
        $('#header-initial').text(initial);

        $('#header-fullname').text(user.nome || 'Utente');
        $('#header-email').text(user.email || '');

        // HACK: Hardcoded Role ID. TODO: Use user.ruolo_nome (see app.py /login)
        const ADMIN_ROLE_ID = 'dcd2d41b-53a6-45d3-9f1a-a2fbef4ad001';
        const roleName = (user.ruolo_id === ADMIN_ROLE_ID) ? 'Amministratore' : 'Utente Standard';
        $('#header-role').val(roleName);

        // Unlock UI
        userSection.removeClass('d-none');

        // Event Handling
        $('#header-btn-logout').on('click', (e) => {
            e.preventDefault();
            logout();
        });

    } catch (e) {
        console.error("Corrupt user data:", e);
        // Fallback: If JSON is corrupt, it's safer to log the user out
        userSection.addClass('d-none');
        logout();
    }
}

// ==========================================
// GLOBAL UTILS
// ==========================================

function logout() {
    // NOTE: clear() is more aggressive/secure than specific removeItem calls for logout
    localStorage.clear(); 
    window.location.href = '/login';
}