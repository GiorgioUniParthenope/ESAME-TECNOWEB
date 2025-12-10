$(function () {

        // Chiamata API al backend Flask (finta login)
        $.ajax({
            url: '/getAllVeicoli',
            method: 'GET',
            contentType: 'application/json',
            dataType: 'json'
        }).done(function (res) {
            console.log(res.veicoli);
        }).fail(function () {
            showAlert('Errore durante la chiamata');
        });
});