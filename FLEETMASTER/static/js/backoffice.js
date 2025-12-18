/* static/js/backoffice.js */

let azioneDaConfermare = null;

$(function () {
    caricaDatiAdmin();

    // Listener per aggiungere veicolo
    $('#addCarForm').on('submit', function (e) {
        e.preventDefault();
        inviaAggiungiVeicolo();
    });

    // Listener per modificare veicolo
    $('#editCarForm').on('submit', function (e) {
        e.preventDefault();
        inviaModificaVeicolo();
    });

    // Listener per il tasto "Procedi" nel modale di conferma
    $('#btnConfermaAzione').on('click', function () {
        if (azioneDaConfermare) {
            azioneDaConfermare();
        }
        $('#modalConferma').modal('hide');
    });
});

function caricaDatiAdmin() {
    caricaRichieste();
    caricaFlotta();
}

/* =========================================
   UTILITY
   ========================================= */

function toggleSpinner(idSpinner, idContenuto, mostra) {
    if (mostra) {
        $(idContenuto).hide();
        $(idSpinner).fadeIn();
    } else {
        $(idSpinner).hide();
        $(idContenuto).fadeIn();
    }
}

function mostraModalConferma(messaggio, callback) {
    $('#modalConfermaTesto').text(messaggio);
    azioneDaConfermare = callback;
    const modal = new bootstrap.Modal(document.getElementById('modalConferma'));
    modal.show();
}

function mostraModalEsito(titolo, messaggio, successo) {
    $('#titoloEsito').text(titolo);
    $('#messaggioEsito').text(messaggio);
    const iconHtml = successo
        ? `<i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>`
        : `<i class="bi bi-x-circle-fill text-danger" style="font-size: 3rem;"></i>`;
    $('#iconaEsito').html(iconHtml);
    const modal = new bootstrap.Modal(document.getElementById('modalEsito'));
    modal.show();
}

/* =========================================
   SEZIONE 1: RICHIESTE (Logica Approvazione)
   ========================================= */

function caricaRichieste() {
    const tbody = $('#requestsBody');
    tbody.empty();

    toggleSpinner('#spinnerRequests', '#tableRequests', true);
    $('#noRequestsMsg').hide();

    $.ajax({
        url: '/getAllPrenotazioniInAttesa',
        method: 'GET',
        dataType: 'json'
    }).done(function (res) {
        if (!res.success || !res.prenotazioni || res.prenotazioni.length === 0) {
            $('#spinnerRequests').hide();
            $('#tableRequests').hide();
            $('#noRequestsMsg').fadeIn();
            $('#badgeRequests').text('0').hide();
            return;
        }

        $('#badgeRequests').text(res.prenotazioni.length).show();

        res.prenotazioni.forEach(p => {
            const row = `
                <tr>
                    <td class="ps-4">
                        <div class="fw-bold text-dark">${p.username}</div>
                        <small class="text-muted">ID: ${p.user_id}</small>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${p.marca} ${p.modello}</div>
                        <span class="badge bg-light text-secondary border">${p.targa}</span>
                    </td>
                    <td>
                        <div class="text-dark"><i class="bi bi-calendar-event me-1"></i>${formatData(p.data_inizio)}</div>
                        <small class="text-muted">Richiesto: ${formatData(p.created_at)}</small>
                    </td>
                    <td>
                        <span class="text-muted small fst-italic text-truncate d-inline-block" style="max-width: 150px;">
                            ${p.note || 'Nessuna nota'}
                        </span>
                    </td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="richiediGestionePrenotazione('${p.id}', 'approva')" title="Approva">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-sm btn-danger shadow-sm" onclick="richiediGestionePrenotazione('${p.id}', 'rifiuta')" title="Rifiuta">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        toggleSpinner('#spinnerRequests', '#tableRequests', false);

    }).fail(function () {
        toggleSpinner('#spinnerRequests', '#tableRequests', false);
        mostraModalEsito("Errore", "Impossibile caricare le richieste.", false);
    });
}

function richiediGestionePrenotazione(id, azione) {
    const verbo = azione === 'approva' ? 'approvare' : 'rifiutare';
    mostraModalConferma(`Sei sicuro di voler ${verbo} questa prenotazione?`, function () {
        eseguiGestionePrenotazione(id, azione);
    });
}

function eseguiGestionePrenotazione(prenotazioneId, azione) {
    const endpoint = azione === 'approva' ? '/approvaPrenotazione' : '/rifiutaPrenotazione';

    $.ajax({
        url: endpoint,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prenotazione_id: prenotazioneId })
    }).done(function (res) {
        if (res.success) {
            mostraModalEsito("Successo", `Prenotazione ${azione === 'approva' ? 'approvata' : 'rifiutata'}!`, true);
            caricaRichieste();
            caricaFlotta(); // Aggiorna anche la flotta perché lo stato auto potrebbe cambiare
        } else {
            mostraModalEsito("Attenzione", res.message, false);
        }
    }).fail(function () {
        mostraModalEsito("Errore", "Errore di comunicazione col server.", false);
    });
}

/* =========================================
   SEZIONE 2: FLOTTA (PARCO AUTO)
   ========================================= */

function caricaFlotta() {
    const tbody = $('#fleetBody');
    tbody.empty();

    $('#fleetBody').closest('.table-responsive').hide();
    $('#spinnerFleet').show();

    $.ajax({
        url: '/getAllVeicoliAdmin',
        method: 'GET',
        dataType: 'json'
    }).done(function (res) {
        $('#spinnerFleet').hide();
        $('#fleetBody').closest('.table-responsive').fadeIn();

        if (!res.success) return;

        res.veicoli.forEach(v => {
            const imgSrc = v.immagine || 'https://via.placeholder.com/100x60?text=No+Img';

            let statusBadge = v.stato_disponibile
                ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i> Disponibile</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i> Occupato</span>`;

            // Escape per evitare problemi col JSON nell'onclick
            const dataVeicolo = JSON.stringify(v).replace(/"/g, '&quot;');

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${v.marca} ${v.modello}</div>
                        <small class="text-muted text-uppercase" style="font-size: 0.75rem;">${v.tipologia}</small>
                    </td>
                    <td>
                        <span class="font-monospace bg-white border px-2 py-1 rounded text-dark">${v.targa}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-warning me-1 shadow-sm" onclick="apriModalModifica(${dataVeicolo})" title="Modifica">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="richiediEliminazione('${v.veicolo_id}')" title="Elimina">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    });
}

/* --- AGGIUNGI --- */
function inviaAggiungiVeicolo() {
    const datiAuto = {
        marca: $('#newMarca').val().trim(),
        modello: $('#newModello').val().trim(),
        targa: $('#newTarga').val().trim(),
        tipologia: $('#newTipologia').val(),
        immagine: $('#newImg').val().trim()
    };

    $.ajax({
        url: '/aggiungiVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datiAuto)
    }).done(function (res) {
        if (res.success) {
            $('#modalAddCar').modal('hide');
            $('#addCarForm')[0].reset();
            mostraModalEsito("Fatto", "Veicolo aggiunto correttamente.", true);
            caricaFlotta();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

/* --- MODIFICA --- */
function apriModalModifica(veicolo) {
    $('#editVeicoloId').val(veicolo.veicolo_id);
    $('#editMarca').val(veicolo.marca);
    $('#editModello').val(veicolo.modello);
    $('#editTarga').val(veicolo.targa);
    $('#editTipologia').val(veicolo.tipologia);
    $('#editImg').val(veicolo.immagine);

    const modal = new bootstrap.Modal(document.getElementById('modalEditCar'));
    modal.show();
}

function inviaModificaVeicolo() {
    const datiAggiornati = {
        veicolo_id: $('#editVeicoloId').val(),
        marca: $('#editMarca').val().trim(),
        modello: $('#editModello').val().trim(),
        targa: $('#editTarga').val().trim(),
        tipologia: $('#editTipologia').val(),
        immagine: $('#editImg').val().trim()
    };

    $.ajax({
        url: '/modificaVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datiAggiornati)
    }).done(function (res) {
        if (res.success) {
            const modalEl = document.getElementById('modalEditCar');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            mostraModalEsito("Modificato", "Dati veicolo aggiornati.", true);
            caricaFlotta();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

/* --- ELIMINA --- */
function richiediEliminazione(id) {
    mostraModalConferma("Sei sicuro di voler eliminare definitivamente questo veicolo?", function () {
        eseguiEliminazione(id);
    });
}

function eseguiEliminazione(id) {
    $.ajax({
        url: '/eliminaVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ veicolo_id: id })
    }).done(function (res) {
        if (res.success) {
            mostraModalEsito("Eliminato", "Veicolo rimosso dal parco auto.", true);
            caricaFlotta();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

function formatData(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}