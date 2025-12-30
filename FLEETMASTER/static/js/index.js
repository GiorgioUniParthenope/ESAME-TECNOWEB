/* static/js/index.js */

// Configurazione e Stato Globale
const ELEMENTI_PER_PAGINA = 6;
let tuttiIVeicoli = [];
let paginaCorrente = 1;
let isNoleggioAttivo = false; // Flag per inibire nuove prenotazioni se utente occupato

// ID temporanei per modali
let idRestituzione = null;
let idRifiuto = null;

// Init & Event Binding
$(function () {
    checkStatoUtente();

    // Handler conferma restituzione
    $('#btnConfermaRestituzione').click(function () {
        if (idRestituzione) eseguiRestituzione(idRestituzione);
    });

    // Handler presa visione rifiuto
    $('#btnAckRifiuto').click(function () {
        if (idRifiuto) cancellaPrenotazioneRifiutata(idRifiuto);
    });
});

/* ==========================================
   LOGICA CORE & STATO
   ========================================== */

function checkStatoUtente() {
    $.ajax({
        url: '/getLastPrenotazione',
        method: 'GET',
        dataType: 'json'
    }).always(function (res) {

        // Reset stato iniziale
        isNoleggioAttivo = false;
        $('#sezionePrenotazioneAttiva').hide();

        if (res && res.success && res.prenotazione) {
            const p = res.prenotazione;

            // Routing stato prenotazione
            if (['prenotata', 'approvata'].includes(p.stato)) {
                // Noleggio in corso -> Card Verde
                isNoleggioAttivo = true;
                renderPrenotazioneAttiva(p);
            }
            else if (p.stato === 'in attesa') {
                // Pending approvazione -> Card Gialla
                isNoleggioAttivo = true;
                renderPrenotazioneInAttesa(p);
            }
            else if (p.stato === 'rifiutata') {
                // Rifiutata -> Blocco UI + Modale Ack
                isNoleggioAttivo = true;
                idRifiuto = p.prenotazione_id;
                new bootstrap.Modal('#modalRifiuto').show();
            }
        }

        // Caricamento asincrono lista veicoli
        caricaVeicoli();
    });
}

function caricaVeicoli() {
    $.get('/getAllVeicoli', function (res) {
        if (!res.success) return;
        tuttiIVeicoli = res.veicoli;
        paginaCorrente = 1;
        renderizzaGrigliaVeicoli();
    });
}

/* ==========================================
   RENDERING UI (LISTA VEICOLI)
   ========================================== */

function renderizzaGrigliaVeicoli() {
    const container = $("#containerVeicoli").empty();

    // Paginazione client-side
    const inizio = (paginaCorrente - 1) * ELEMENTI_PER_PAGINA;
    const veicoliPagina = tuttiIVeicoli.slice(inizio, inizio + ELEMENTI_PER_PAGINA);

    veicoliPagina.forEach(v => {
        const imgSrc = v.img || 'https://img.freepik.com/free-psd/cartoon-modern-car-illustration_23-2151227151.jpg';
        const isAvailable = v.stato_disponibile;

        // Setup badge stato
        const badgeHtml = isAvailable
            ? `<span class="status-badge bg-success text-white"><i class="bi bi-check-circle me-1"></i>Disponibile</span>`
            : `<span class="status-badge bg-secondary text-white"><i class="bi bi-x-circle me-1"></i>Occupato</span>`;

        // Setup bottone azione (Logica inibizione)
        let btnProps = { class: 'btn-primary', text: 'Prenota Ora', attr: '' };

        if (isNoleggioAttivo) {
            btnProps = { class: 'btn-secondary opacity-50', text: 'Noleggio in corso', attr: 'disabled' };
        } else if (!isAvailable) {
            btnProps = { class: 'btn-light text-muted border', text: 'Non disponibile', attr: 'disabled' };
        }

        const card = `
            <div class="col">
                <div class="vehicle-card h-100 shadow-sm border-0 transition-hover">
                    <div class="vehicle-img-wrapper position-relative overflow-hidden" style="height: 200px;">
                        <img src="${imgSrc}" alt="${v.modello}" class="w-100 h-100 object-fit-cover">
                        ${badgeHtml}
                    </div>
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="fw-bold mb-0 text-truncate" style="max-width: 70%;">${v.marca} ${v.modello}</h5>
                            <span class="badge bg-light text-dark border">${v.anno_immatricolazione || v.anno || '2023'}</span>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex align-items-center text-muted small mb-1">
                                <i class="bi bi-123 me-2 text-primary"></i> <span>${v.targa}</span>
                            </div>
                            <div class="d-flex align-items-center text-muted small">
                                <i class="bi bi-fuel-pump me-2 text-primary"></i> <span>${v.tipologia || 'Standard'}</span>
                            </div>
                        </div>
                        <button class="btn ${btnProps.class} w-100 fw-semibold" onclick="vaiAPrenotazione('${v.veicolo_id}')" ${btnProps.attr}>
                            ${btnProps.text}
                        </button>
                    </div>
                </div>
            </div>`;
        container.append(card);
    });

    renderizzaPaginazione();
}

function renderizzaPaginazione() {
    const navContainer = $('#paginationContainer').empty();
    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);

    if (totalePagine <= 1) return;

    // Helper generazione link
    const createLink = (page, text, disabled = false, active = false) => `
        <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
            <a class="page-link shadow-none" href="#" onclick="cambiaPagina(${page}); return false;">${text}</a>
        </li>`;

    navContainer.append(createLink(paginaCorrente - 1, 'Precedente', paginaCorrente === 1));

    for (let i = 1; i <= totalePagine; i++) {
        navContainer.append(createLink(i, i, false, i === paginaCorrente));
    }

    navContainer.append(createLink(paginaCorrente + 1, 'Successiva', paginaCorrente === totalePagine));
}

function cambiaPagina(nuovaPagina) {
    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);
    if (nuovaPagina < 1 || nuovaPagina > totalePagine) return;

    paginaCorrente = nuovaPagina;
    renderizzaGrigliaVeicoli();
    $('html, body').animate({ scrollTop: $("#sezioneListaVeicoli").offset().top - 100 }, 300);
}

/* ==========================================
   RENDERING UI (STATUS CARD)
   ========================================== */

function renderPrenotazioneAttiva(prenotazione) {
    const v = prenotazione.veicolo;
    const imgUrl = v.img || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

    const html = `
        <div class="active-booking-card p-0 overflow-hidden mb-5 border border-primary border-opacity-25 shadow-sm rounded-4">
            <div class="row g-0">
                <div class="col-md-4 position-relative">
                    <div class="position-absolute top-0 start-0 m-3 z-1">
                         <span class="badge bg-primary px-3 py-2 shadow-sm">Noleggio Attivo</span>
                    </div>
                    <img src="${imgUrl}" class="img-fluid h-100 w-100 object-fit-cover" alt="${v.modello}" style="min-height: 250px;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="card-title fw-bold fs-3 mb-1 text-dark">${v.marca} ${v.modello}</h5>
                                <p class="text-muted mb-0"><i class="bi bi-car-front me-1"></i> ${v.targa}</p>
                            </div>
                        </div>
                        <div class="row g-3 mb-4">
                            <div class="col-sm-6">
                                <div class="p-3 bg-light rounded-3 border">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Ritiro</small>
                                    <div class="fw-semibold text-dark mt-1">
                                        <i class="bi bi-calendar-check text-primary me-2"></i> ${new Date(prenotazione.data_inizio).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="p-3 bg-light rounded-3 border">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Consegna Prevista</small>
                                    <div class="fw-semibold text-dark mt-1">
                                        <i class="bi bi-calendar-x text-primary me-2"></i> ${new Date(prenotazione.data_fine).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-end mt-auto">
                            <button class="btn btn-outline-danger px-4 py-2 fw-semibold" onclick="apriModalRestituzione('${prenotazione.prenotazione_id}')">
                                <i class="bi bi-key me-2"></i> Restituisci Veicolo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    $('#titoloSezionePrenotazione').html('<i class="bi bi-check-circle-fill text-primary me-2"></i>Il tuo Noleggio Attivo');
    $('#containerTuaPrenotazione').html(html);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

function renderPrenotazioneInAttesa(prenotazione) {
    const v = prenotazione.veicolo;
    const imgUrl = v.img || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

    const html = `
        <div class="active-booking-card p-0 overflow-hidden mb-5 border border-warning border-opacity-50 shadow-sm rounded-4">
            <div class="row g-0">
                <div class="col-md-4 position-relative">
                    <div class="position-absolute top-0 start-0 m-3 z-1">
                         <span class="badge bg-warning text-dark px-3 py-2 shadow-sm"><i class="bi bi-hourglass-split me-1"></i> In Attesa</span>
                    </div>
                    <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>
                    <img src="${imgUrl}" class="img-fluid h-100 w-100 object-fit-cover" alt="${v.modello}" style="min-height: 250px;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <div class="alert alert-warning d-flex align-items-center mb-3" role="alert">
                            <i class="bi bi-info-circle-fill flex-shrink-0 me-2 fs-5"></i>
                            <div><strong>Richiesta inviata!</strong> In attesa di approvazione admin.</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h5 class="card-title fw-bold fs-3 mb-1 text-dark">${v.marca} ${v.modello}</h5>
                                <p class="text-muted mb-0">Targa: <strong>${v.targa}</strong></p>
                            </div>
                        </div>
                        <div class="mt-3 bg-light p-3 rounded border border-warning border-opacity-25">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-calendar-event text-warning me-3 fs-5"></i>
                                <div>
                                    <small class="text-muted d-block">Periodo Richiesto</small>
                                    <span class="fw-semibold">Dal ${new Date(prenotazione.data_inizio).toLocaleDateString()} al ${new Date(prenotazione.data_fine).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 text-center text-muted small">Non puoi prenotare altri veicoli finché questa richiesta è pendente.</div>
                    </div>
                </div>
            </div>
        </div>`;

    $('#titoloSezionePrenotazione').html('<i class="bi bi-hourglass-split text-warning me-2"></i>Richiesta in Lavorazione');
    $('#containerTuaPrenotazione').html(html);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

/* ==========================================
   AZIONI (PRENOTAZIONE / RESTITUZIONE)
   ========================================== */

function vaiAPrenotazione(id) {
    window.location.href = `/prenotazione?idveicolo=${id}`;
}

function apriModalRestituzione(id) {
    idRestituzione = id;
    new bootstrap.Modal('#modalRestituzione').show();
}

function eseguiRestituzione(id) {
    const btn = $('#btnConfermaRestituzione');
    btn.prop('disabled', true).text('Elaborazione...');

    $.ajax({
        url: '/restituisciVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prenotazione_id: id })
    }).done(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalRestituzione')).hide();
            // Show modal successo e refresh al close
            const modalSucc = new bootstrap.Modal(document.getElementById('modalSuccesso'));
            document.getElementById('modalSuccesso').addEventListener('hidden.bs.modal', () => location.reload());
            modalSucc.show();
        } else {
            alert("Errore: " + res.message);
            btn.prop('disabled', false).text('Sì, Restituisci');
        }
    }).fail(() => {
        alert("Errore di connessione.");
        btn.prop('disabled', false).text('Sì, Restituisci');
    });
}

function cancellaPrenotazioneRifiutata(id) {
    const btn = $('#btnAckRifiuto');
    btn.prop('disabled', true).text('Elaborazione...');

    $.ajax({
        url: '/confermaVisioneRifiuto',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prenotazione_id: id })
    }).done(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalRifiuto')).hide();
            location.reload();
        } else {
            alert("Errore: " + res.message);
            btn.prop('disabled', false).text('Ho Capito');
        }
    }).fail(() => {
        alert("Errore di connessione.");
        btn.prop('disabled', false).text('Ho Capito');
    });
}