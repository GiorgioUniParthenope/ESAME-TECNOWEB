// --- VARIABILI GLOBALI ---
let tuttiIVeicoli = [];
let isNoleggioAttivo = false; // Diventa true se c'è una prenotazione attiva O in attesa
const ELEMENTI_PER_PAGINA = 6;
let paginaCorrente = 1;
let prenotazioneIdDaCancellare = null;

$(function () {
    caricaTutto();

    // Gestione click sul bottone "Conferma Restituzione"
    $('#btnConfermaRestituzione').click(function () {
        if (prenotazioneIdDaCancellare) {
            eseguiRestituzione(prenotazioneIdDaCancellare);
        }
    });
});

function caricaTutto() {
    $.ajax({
        url: '/getLastPrenotazione',
        method: 'GET',
        dataType: 'json'
    }).always(function (res) {

        // Reset stato
        isNoleggioAttivo = false;
        $('#sezionePrenotazioneAttiva').hide();

        if (res && res.success && res.prenotazione) {
            const p = res.prenotazione;

            // CASO 1: Prenotazione ATTIVA (Approvata o Prenotata) -> Card VERDE
            if (p.stato === 'prenotata' || p.stato === 'approvata') {
                isNoleggioAttivo = true;
                mostraPrenotazioneAttiva(p);
            }
            // CASO 2: Prenotazione IN ATTESA -> Card GIALLA
            else if (p.stato === 'in attesa') {
                isNoleggioAttivo = true; // Blocca comunque i bottoni
                mostraPrenotazioneInAttesa(p);
            }
        }

        // Carichiamo la lista veicoli (i bottoni saranno disabilitati se isNoleggioAttivo è true)
        scaricaVeicoli();
    });
}

// === CARD VERDE (Attiva) ===
function mostraPrenotazioneAttiva(prenotazione) {
    const container = $('#containerTuaPrenotazione');
    container.empty();
    const v = prenotazione.veicolo;
    const imgUrl = v.img ? v.img : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

    const cardHtml = `
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
                                        <i class="bi bi-calendar-check text-primary me-2"></i>
                                        ${new Date(prenotazione.data_inizio).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="p-3 bg-light rounded-3 border">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Consegna Prevista</small>
                                    <div class="fw-semibold text-dark mt-1">
                                        <i class="bi bi-calendar-x text-primary me-2"></i>
                                        ${new Date(prenotazione.data_fine).toLocaleDateString()}
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
        </div>
    `;

    $('#titoloSezionePrenotazione').html('<i class="bi bi-check-circle-fill text-primary me-2"></i>Il tuo Noleggio Attivo');
    container.html(cardHtml);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

// === CARD GIALLA (In Attesa) ===
function mostraPrenotazioneInAttesa(prenotazione) {
    const container = $('#containerTuaPrenotazione');
    container.empty();
    const v = prenotazione.veicolo;
    const imgUrl = v.img ? v.img : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

    const cardHtml = `
        <div class="active-booking-card p-0 overflow-hidden mb-5 border border-warning border-opacity-50 shadow-sm rounded-4">
            <div class="row g-0">
                <div class="col-md-4 position-relative">
                    <div class="position-absolute top-0 start-0 m-3 z-1">
                         <span class="badge bg-warning text-dark px-3 py-2 shadow-sm">
                            <i class="bi bi-hourglass-split me-1"></i> In Attesa
                         </span>
                    </div>
                    <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>
                    <img src="${imgUrl}" class="img-fluid h-100 w-100 object-fit-cover" alt="${v.modello}" style="min-height: 250px;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <div class="alert alert-warning d-flex align-items-center mb-3" role="alert">
                            <i class="bi bi-info-circle-fill flex-shrink-0 me-2 fs-5"></i>
                            <div>
                                <strong>Richiesta inviata!</strong> Un amministratore deve approvare la prenotazione prima del ritiro.
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h5 class="card-title fw-bold fs-3 mb-1 text-dark">${v.marca} ${v.modello}</h5>
                                <p class="text-muted mb-0">Richiesta per targa: <strong>${v.targa}</strong></p>
                            </div>
                        </div>

                        <div class="mt-3 bg-light p-3 rounded border border-warning border-opacity-25">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-calendar-event text-warning me-3 fs-5"></i>
                                <div>
                                    <small class="text-muted d-block">Periodo Richiesto</small>
                                    <span class="fw-semibold">
                                        Dal ${new Date(prenotazione.data_inizio).toLocaleDateString()} al ${new Date(prenotazione.data_fine).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 text-center text-muted small">
                            Non puoi prenotare altri veicoli finché questa richiesta è pendente.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('#titoloSezionePrenotazione').html('<i class="bi bi-hourglass-split text-warning me-2"></i>Richiesta in Lavorazione');
    container.html(cardHtml);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

// === CARICAMENTO VEICOLI ===
function scaricaVeicoli() {
    $.ajax({
        url: '/getAllVeicoli',
        method: 'GET',
        dataType: 'json'
    }).done(function (res) {
        if (!res.success) return;
        tuttiIVeicoli = res.veicoli;
        paginaCorrente = 1;
        renderizzaPagina();
    });
}

function renderizzaPagina() {
    const container = $("#containerVeicoli");
    container.empty();

    const inizio = (paginaCorrente - 1) * ELEMENTI_PER_PAGINA;
    const fine = inizio + ELEMENTI_PER_PAGINA;
    const veicoliPagina = tuttiIVeicoli.slice(inizio, fine);

    veicoliPagina.forEach(v => {
        const imgSrc = v.immagine ? v.immagine : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';
        const isAvailable = v.stato_disponibile;

        let badgeHtml = isAvailable
            ? `<span class="status-badge bg-success text-white"><i class="bi bi-check-circle me-1"></i>Disponibile</span>`
            : `<span class="status-badge bg-secondary text-white"><i class="bi bi-x-circle me-1"></i>Occupato</span>`;

        let btnAttr = '';
        let btnClass = 'btn-primary';
        let btnText = 'Prenota Ora';

        // Disabilita tasti se noleggio attivo O in attesa
        if (isNoleggioAttivo) {
            btnAttr = 'disabled';
            btnClass = 'btn-secondary opacity-50';
            btnText = 'Noleggio in corso';
        } else if (!isAvailable) {
            btnAttr = 'disabled';
            btnClass = 'btn-light text-muted border';
            btnText = 'Non disponibile';
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
                            <i class="bi bi-123 me-2 text-primary"></i> 
                            <span>${v.targa}</span>
                        </div>
                        <div class="d-flex align-items-center text-muted small">
                            <i class="bi bi-fuel-pump me-2 text-primary"></i> 
                            <span>${v.tipologia || 'Standard'}</span>
                        </div>
                    </div>
                    <button class="btn ${btnClass} w-100 fw-semibold" 
                            onclick="vaiAPrenotazione('${v.veicolo_id}')" 
                            ${btnAttr}>
                        ${btnText}
                    </button>
                </div>
            </div>
        </div>
        `;
        container.append(card);
    });

    renderizzaControlliPaginazione();
}

function renderizzaControlliPaginazione() {
    const navContainer = $('#paginationContainer');
    navContainer.empty();
    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);
    if (totalePagine <= 1) return;

    const prevDisabled = paginaCorrente === 1 ? 'disabled' : '';
    navContainer.append(`
        <li class="page-item ${prevDisabled}">
            <a class="page-link shadow-none" href="#" onclick="cambiaPagina(${paginaCorrente - 1}); return false;">Precedente</a>
        </li>
    `);

    for (let i = 1; i <= totalePagine; i++) {
        const activeClass = i === paginaCorrente ? 'active' : '';
        navContainer.append(`
            <li class="page-item ${activeClass}">
                <a class="page-link shadow-none" href="#" onclick="cambiaPagina(${i}); return false;">${i}</a>
            </li>
        `);
    }

    const nextDisabled = paginaCorrente === totalePagine ? 'disabled' : '';
    navContainer.append(`
        <li class="page-item ${nextDisabled}">
            <a class="page-link shadow-none" href="#" onclick="cambiaPagina(${paginaCorrente + 1}); return false;">Successiva</a>
        </li>
    `);
}

function cambiaPagina(nuovaPagina) {
    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);
    if (nuovaPagina < 1 || nuovaPagina > totalePagine) return;
    paginaCorrente = nuovaPagina;
    renderizzaPagina();
    $('html, body').animate({ scrollTop: $("#sezioneListaVeicoli").offset().top - 100 }, 300);
}

function vaiAPrenotazione(id) {
    window.location.href = `/prenotazione?idveicolo=${id}`;
}

function apriModalRestituzione(prenotazioneId) {
    prenotazioneIdDaCancellare = prenotazioneId;
    const myModal = new bootstrap.Modal(document.getElementById('modalRestituzione'));
    myModal.show();
}

function eseguiRestituzione(prenotazioneId) {
    $('#btnConfermaRestituzione').prop('disabled', true).text('Restituzione in corso...');
    $.ajax({
        url: '/restituisciVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prenotazione_id: prenotazioneId })
    }).done(function (res) {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalRestituzione')).hide();
            const successModal = new bootstrap.Modal(document.getElementById('modalSuccesso'));
            successModal.show();
            document.getElementById('modalSuccesso').addEventListener('hidden.bs.modal', function () {
                location.reload();
            });
        } else {
            alert("Errore: " + res.message);
            $('#btnConfermaRestituzione').prop('disabled', false).text('Sì, Restituisci');
        }
    }).fail(function () {
        alert("Errore di connessione col server.");
        $('#btnConfermaRestituzione').prop('disabled', false).text('Sì, Restituisci');
    });
}