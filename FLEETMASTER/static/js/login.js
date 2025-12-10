function showAlert(message, type = 'danger') {
    const html = `<div class="alert alert-${type} alert-dismissible" role="alert">
${message}
<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>`;
    $('#alertPlaceholder').html(html);
}


$(function () {
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();


        const username = $('#username').val().trim();
        const password = $('#password').val().trim();


        if (!username || !password) {
            showAlert('Inserisci username e password', 'warning');
            return;
        }


        // Chiamata API al backend Flask (finta login)
        $.ajax({
            url: '/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            dataType: 'json'
        }).done(function (res) {
            if (res.success) {
                window.location.href = '/';
            } else {
                showAlert(res.message || 'Credenziali non valide');
            }
        }).fail(function () {
            showAlert('Errore durante il login, riprova');
        });
    });
});


