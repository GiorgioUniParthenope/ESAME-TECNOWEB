/* static/js/login.js */

// ==========================================
// INIT & EVENT HANDLERS
// ==========================================

$(function () {
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
                    // Login OK: Redirect alla dashboard
                    window.location.href = '/';
                } else {
                    // Errore credenziali o lato server
                    showAlert(res.message || 'Credenziali non valide');
                    toggleLoading(false);
                }
            })
            .fail(function () {
                // Gestione errori di rete
                showAlert('Errore di connessione al server, riprova.');
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