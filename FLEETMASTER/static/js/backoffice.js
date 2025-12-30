/* static/js/backoffice.js */

let azioneDaConfermare = null;

// Init & Event Listener
$(function () {

    /* ==========================================
       GESTIONE JWT & SICUREZZA ADMIN (ROBUSTA)
       ========================================== */
    const token = localStorage.getItem('jwt_token');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    // DEBUG: Controllo token in console
    console.log("[Backoffice] Token letto:", token);

    // 1. Check Token immediato
    if (!token || token === "null" || token === "undefined") {
        console.warn("Token Admin invalido o assente. Redirect...");
        window.location.href = '/login';
        return;
    }

    // 2. Check Ruolo (Protezione Front-end Extra)
    // Se un utente normale prova ad accedere qui, lo rispediamo alla Home
    if (userData.ruolo_nome !== 'admin') {
        alert("Accesso non autorizzato. Area riservata agli amministratori.");
        window.location.href = '/';
        return;
    }

    // 3. Setup Globale Header Auth (Forzato con beforeSend)
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    });

    // 4. Gestore Errori 401/422 (Scadenza Token)
    $(document).ajaxError(function (event, jqXHR) {
        // Evita loop se siamo già sul login
        if (window.location.pathname === '/login') return;

        if (jqXHR.status === 401 || jqXHR.status === 422) {
            console.error("Sessione Admin scaduta (401).");

            // Pulizia storage
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_data');

            alert("Sessione scaduta. Effettua nuovamente il login.");
            window.location.href = '/login';
        }
    });
    /* ========================================== */


    caricaDatiAdmin();

    // Binding submit form
    $('#addCarForm').on('submit', (e) => { e.preventDefault(); inviaAggiungiVeicolo(); });
    $('#editCarForm').on('submit', (e) => { e.preventDefault(); inviaModificaVeicolo(); });

    // Gestione conferma modale generico
    $('#btnConfermaAzione').on('click', function () {
        if (azioneDaConfermare) azioneDaConfermare();

        // Chiusura sicura modale Bootstrap
        const modalEl = document.getElementById('modalConferma');
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
    });
});

function caricaDatiAdmin() {
    caricaRichieste();
    caricaFlotta();
}

/* ================================
   Utility & Gestione UI
   ================================ */

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
    new bootstrap.Modal('#modalConferma').show();
}

function mostraModalEsito(titolo, messaggio, successo) {
    $('#titoloEsito').text(titolo);
    $('#messaggioEsito').text(messaggio);

    const iconClass = successo ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger';
    $('#iconaEsito').html(`<i class="bi ${iconClass}" style="font-size: 3rem;"></i>`);

    new bootstrap.Modal('#modalEsito').show();
}

function formatData(isoString) {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ================================
   Sezione Richieste (Prenotazioni)
   ================================ */

function caricaRichieste() {
    toggleSpinner('#spinnerRequests', '#tableRequests', true);
    $('#noRequestsMsg').hide();
    const tbody = $('#requestsBody').empty();

    $.get('/getAllPrenotazioniInAttesa', function (res) {
        // Check dati vuoti o errore
        if (!res.success || !res.prenotazioni?.length) {
            $('#spinnerRequests').hide();
            $('#noRequestsMsg').fadeIn();
            $('#badgeRequests').hide();
            return;
        }

        $('#badgeRequests').text(res.prenotazioni.length).show();

        // Render righe tabella
        res.prenotazioni.forEach(p => {
            tbody.append(`
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
                    <td><span class="text-muted small fst-italic text-truncate d-inline-block" style="max-width: 150px;">${p.note || 'Nessuna nota'}</span></td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="gestisciRichiesta('${p.id}', 'approva')"><i class="bi bi-check-lg"></i></button>
                        <button class="btn btn-sm btn-danger shadow-sm" onclick="gestisciRichiesta('${p.id}', 'rifiuta')"><i class="bi bi-x-lg"></i></button>
                    </td>
                </tr>
            `);
        });
        toggleSpinner('#spinnerRequests', '#tableRequests', false);
    }).fail(() => {
        // Il fail 401 è gestito globalmente, qui gestiamo altri errori
        toggleSpinner('#spinnerRequests', '#tableRequests', false);
        // Evitiamo modale errore se è un redirect da 401
        const t = localStorage.getItem('jwt_token');
        if (t && t !== "null" && t !== "undefined") {
            mostraModalEsito("Errore", "Impossibile caricare le richieste.", false);
        }
    });
}

function gestisciRichiesta(id, azione) {
    const verbo = azione === 'approva' ? 'approvare' : 'rifiutare';

    mostraModalConferma(`Vuoi ${verbo} questa prenotazione?`, () => {
        const endpoint = azione === 'approva' ? '/approvaPrenotazione' : '/rifiutaPrenotazione';

        $.ajax({
            url: endpoint,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prenotazione_id: id })
        }).done(res => {
            if (res.success) {
                mostraModalEsito("Successo", `Prenotazione ${azione === 'approva' ? 'approvata' : 'rifiutata'}!`, true);
                caricaDatiAdmin(); // Refresh totale per aggiornare badge e disponibilità auto
            } else {
                mostraModalEsito("Attenzione", res.message, false);
            }
        });
    });
}

/* ================================
   Sezione Flotta (CRUD Veicoli)
   ================================ */

function caricaFlotta() {
    $('#fleetBody').closest('.table-responsive').hide();
    $('#spinnerFleet').show();
    const tbody = $('#fleetBody').empty();

    $.get('/getAllVeicoliAdmin', function (res) {
        $('#spinnerFleet').hide();
        $('#fleetBody').closest('.table-responsive').fadeIn();

        if (!res.success) return;

        res.veicoli.forEach(v => {
            const statusBadge = v.stato_disponibile
                ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i> Disponibile</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i> Occupato</span>`;

            // Fix per evitare problemi di quote nel JSON inline
            const dataVeicolo = JSON.stringify(v).replace(/"/g, '&quot;');

            tbody.append(`
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${v.marca} ${v.modello}</div>
                        <small class="text-muted text-uppercase" style="font-size: 0.75rem;">${v.tipologia}</small>
                    </td>
                    <td><span class="font-monospace bg-white border px-2 py-1 rounded text-dark">${v.targa}</span></td>
                    <td>${statusBadge}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-warning me-1 shadow-sm" onclick="apriModalModifica(${dataVeicolo})"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="richiediEliminazione('${v.veicolo_id}')"><i class="bi bi-trash-fill"></i></button>
                    </td>
                </tr>
            `);
        });
    });
}

function inviaAggiungiVeicolo() {
    const dati = {
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
        data: JSON.stringify(dati)
    }).done(res => {
        if (res.success) {
            // Usa istanza Bootstrap per chiudere modale in modo sicuro
            const modalEl = document.getElementById('modalAddCar');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();

            $('#addCarForm')[0].reset();
            mostraModalEsito("Fatto", "Veicolo aggiunto.", true);
            caricaFlotta();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

function apriModalModifica(v) {
    // Popolamento campi modale
    $('#editVeicoloId').val(v.veicolo_id);
    $('#editMarca').val(v.marca);
    $('#editModello').val(v.modello);
    $('#editTarga').val(v.targa);
    $('#editTipologia').val(v.tipologia);
    $('#editImg').val(v.immagine);

    new bootstrap.Modal('#modalEditCar').show();
}

function inviaModificaVeicolo() {
    const dati = {
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
        data: JSON.stringify(dati)
    }).done(res => {
        if (res.success) {
            const modalEl = document.getElementById('modalEditCar');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();

            mostraModalEsito("Modificato", "Dati aggiornati.", true);
            caricaFlotta();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

function richiediEliminazione(id) {
    mostraModalConferma("Eliminare definitivamente questo veicolo?", () => {
        $.ajax({
            url: '/eliminaVeicolo',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ veicolo_id: id })
        }).done(res => {
            if (res.success) {
                mostraModalEsito("Eliminato", "Veicolo rimosso.", true);
                caricaFlotta();
            } else {
                mostraModalEsito("Errore", res.message, false);
            }
        });
    });
}