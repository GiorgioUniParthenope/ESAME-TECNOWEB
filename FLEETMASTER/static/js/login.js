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

// Funzioni per gestire lo stato di caricamento del bottone
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

$(function () {
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        // Pulisci vecchi alert
        $('#alertPlaceholder').empty();

        const username = $('#username').val().trim();
        const password = $('#password').val().trim();

        if (!username || !password) {
            showAlert('Inserisci username e password', 'warning');
            return;
        }

        // Attiva lo stato di caricamento
        toggleLoading(true);

        $.ajax({
            url: '/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            dataType: 'json'
        })
            .done(function (res) {
                if (res.success) {
                    // Opzionale: mostra un messaggio di successo prima del redirect
                    // showAlert('Accesso riuscito!', 'success');
                    window.location.href = '/';
                } else {
                    showAlert(res.message || 'Credenziali non valide');
                    toggleLoading(false); // Riabilita il bottone solo se fallisce
                }
            })
            .fail(function () {
                showAlert('Errore di connessione al server, riprova.');
                toggleLoading(false);
            });
    });
});