$.ajax({
    url: '/getAllVeicoli',
    method: 'GET',
    dataType: 'json'
}).done(function (res) {
    if (!res.success) return;

    const container = $("#containerVeicoli");
    container.empty();

    res.veicoli.forEach(v => {
        // Immagine di default se non ce l'hai
        const imgSrc = v.immagine ? v.immagine : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

        const badgeClass = v.stato_disponibile ? 'disponibile' : 'non-disponibile';
        const badgeText = v.stato_disponibile ? 'Disponibile' : 'Non disponibile';

        const card = `
            <div class="card-veicolo">
                <img src="${imgSrc}" alt="${v.modello}">
                <div class="card-title">${v.marca} ${v.modello}</div>
                <div class="card-info"><strong>Targa:</strong> ${v.targa}</div>
                <div class="card-info"><strong>Anno:</strong> ${v.anno_immatricolazione}</div>
                <div class="card-info"><strong>Tipologia:</strong> ${v.tipologia}</div>
                <div class="card-info">
                    <strong>Ultima manutenzione:</strong> ${v.ultima_manutenzione ? v.ultima_manutenzione : 'Nessuna'}
                </div>
                <div class="card-badge ${badgeClass}">${badgeText}</div>
                <button class="card-button" onclick="prenotaVeicolo('${v.veicolo_id}')">Prenota</button>
            </div>
        `;

        container.append(card);
    });

}).fail(function () {
    showAlert('Errore durante la chiamata');
});


function prenotaVeicolo(id) {
    $.ajax({
        url: '/prenotaVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            user_id: 'UUID_UTENTE',
            veicolo_id: 'UUID_VEICOLO',
            data_inizio: '2025-12-15T10:00:00',
            data_fine: '2025-12-18T18:00:00',
            note: 'Prenotazione di prova'
        })
    }).done(function (res) {
        if (res.success) alert(res.message);
        else alert("Errore: " + res.message);
    }).fail(function () {
        alert("Errore durante la chiamata");
    });

}