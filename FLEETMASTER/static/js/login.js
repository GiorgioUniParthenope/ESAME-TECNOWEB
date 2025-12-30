/* static/js/login.js */

// ==========================================
// INIT & EVENT HANDLERS
// ==========================================

$(function () {
    // Controllo preventivo: Se ho già un token valido, vado alla pagina giusta
    // (Opzionale: potresti voler controllare il ruolo anche qui per reindirizzare meglio)
    if (localStorage.getItem('jwt_token')) {
        window.location.href = '/';
        return;
    }

    // Binding submit form di login
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        // Reset stato precedente
        $('#alertPlaceholder').empty();
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();

        // Validazione client-side basilare
        if (!email || !password) {
            showAlert('Inserisci email e password', 'warning');
            return;
        }

        // Lock interfaccia (evita doppio submit)
        toggleLoading(true);

        // Chiamata API autenticazione
        $.ajax({
            url: '/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            dataType: 'json'
        })
            .done(function (res) {
                if (res.success) {
                    // ==================================================
                    // 🟢 GESTIONE LOGIN & REINDIRIZZAMENTO
                    // ==================================================

                    // 1. Salva il token nel browser
                    localStorage.setItem('jwt_token', res.token);

                    // 2. Salva i dati utente
                    localStorage.setItem('user_data', JSON.stringify(res.user));

                    // 3. SMISTAMENTO IN BASE AL RUOLO
                    // Controlla il campo 'ruolo_nome' inviato dal backend
                    if (res.user.ruolo_nome === 'admin') {
                        // Gli Admin vanno al Backoffice
                        window.location.href = '/backoffice_view';
                    } else {
                        // Gli altri (Manager/Impiegati) vanno alla Home
                        window.location.href = '/';
                    }

                } else {
                    // Errore credenziali o lato server
                    showAlert(res.message || 'Credenziali non valide');
                    toggleLoading(false);
                }
            })
            .fail(function (jqXHR) {
                // Gestione errori di rete o errori server non gestiti
                let msg = 'Errore di connessione al server.';
                if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                    msg = jqXHR.responseJSON.message;
                }
                showAlert(msg);
                toggleLoading(false);
            });
    });
});

// ==========================================
// UI HELPERS
// ==========================================

/**
 * Gestisce lo stato visivo del bottone di submit (spinner/testo)
 */
function toggleLoading(isLoading) {
    const $btn = $('#loginBtn');
    const $text = $btn.find('.btn-text');
    const $spinner = $btn.find('.spinner-border');

    if (isLoading) {
        $btn.prop('disabled', true);
        $text.hide();
        $spinner.removeClass('d-none');
    } else {
        $btn.prop('disabled', false);
        $text.show();
        $spinner.addClass('d-none');
    }
}

/**
 * Renderizza un alert Bootstrap dinamico nel placeholder
 */
function showAlert(message, type = 'danger') {
    const icon = type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

    const html = `
        <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center" role="alert">
            <i class="bi ${icon} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

    $('#alertPlaceholder').hide().html(html).fadeIn();
}