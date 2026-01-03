// ==========================================
// INIT & HANDLERS
// ==========================================

$(function () {
    // Fast check: Active session -> Immediate redirect
    if (localStorage.getItem('jwt_token')) {
        window.location.href = '/';
        return;
    }

    $('#loginForm').on('submit', function (e) {
        e.preventDefault();
        $('#alertPlaceholder').empty();

        const email = $('#email').val().trim();
        const password = $('#password').val().trim();

        // Client-side Validation
        if (!email || !password) {
            showAlert('Inserisci email e password', 'warning');
            return;
        }

        // Lock UI (Anti-spam click)
        caricamentoElemento(true);

        $.ajax({
            url: '/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            dataType: 'json'
        })
        .done(function (res) {
            if (res.success) {
                // --- LOGIN SUCCESS ---
                localStorage.setItem('jwt_token', res.token);
                localStorage.setItem('user_data', JSON.stringify(res.user));

                // Role-based routing: Admin -> Backoffice, Others -> Home
                const target = (res.user.ruolo_nome === 'admin') ? '/backoffice' : '/';
                window.location.href = target;

            } else {
                showAlert(res.message || 'Credenziali non valide');
                caricamentoElemento(false);
            }
        })
        .fail(function (jqXHR) {
            // Network error or generic Server error
            const msg = jqXHR.responseJSON?.message || 'Errore connessione server.';
            showAlert(msg);
            caricamentoElemento(false);
        });
    });
});

// ==========================================
// UI HELPERS
// ==========================================

function caricamentoElemento(isLoading) {
    const $btn = $('#loginBtn');
    
    $btn.prop('disabled', isLoading);
    
    // Toggle text/spinner visibility
    if (isLoading) {
        $btn.find('.btn-text').hide();
        $btn.find('.spinner-border').removeClass('d-none');
    } else {
        $btn.find('.btn-text').show();
        $btn.find('.spinner-border').addClass('d-none');
    }
}

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