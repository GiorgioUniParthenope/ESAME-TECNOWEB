// --- VARIABILI GLOBALI PER LA PAGINAZIONE ---
let tuttiIVeicoli = [];      // Conterrà l'array completo scaricato dal server
let isNoleggioAttivo = false; // Memorizza se l'utente ha già un'auto
const ELEMENTI_PER_PAGINA = 6;
let paginaCorrente = 1;
let prenotazioneIdDaCancellare = null;

$(function () {
    caricaTutto();

    // Gestione click sul bottone "Conferma Restituzione" nella modale
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
        let activeBooking = null;

        // Resetta lo stato globale
        isNoleggioAttivo = false;

        if (res && res.success && res.prenotazione.stato === 'prenotata') {
            activeBooking = res.prenotazione;
            isNoleggioAttivo = true;
            mostraPrenotazioneAttiva(activeBooking);
        } else {
            $('#sezionePrenotazioneAttiva').hide();
        }

        // Ora carichiamo i veicoli sapendo se il noleggio è attivo
        scaricaVeicoli();
    });
}

function mostraPrenotazioneAttiva(prenotazione) {
    const container = $('#containerTuaPrenotazione');
    container.empty();
    const v = prenotazione.veicolo;
    const imgUrl = v.img ? v.img : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWedVLhlY2r49FiiN3A0hnXqN10gs6lvEB4Q&s';

    const cardHtml = `
        <div class="active-booking-card p-0 overflow-hidden mb-5">
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${imgUrl}" class="img-fluid h-100 w-100 object-fit-cover" alt="${v.modello}" style="min-height: 200px;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h5 class="card-title fw-bold fs-4 mb-1">${v.marca} ${v.modello}</h5>
                                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-3">In Corso</span>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-sm-6 mb-2">
                                <small class="text-muted d-block">Targa</small>
                                <span class="fw-semibold"><i class="bi bi-car-front me-1"></i> ${v.targa}</span>
                            </div>
                            <div class="col-sm-6 mb-2">
                                <small class="text-muted d-block">Inizio Noleggio</small>
                                <span class="fw-semibold"><i class="bi bi-calendar-check me-1"></i> ${prenotazione.data_inizio.replace('T', ' ')}</span>
                            </div>
                            <div class="col-12 mt-2">
                                <small class="text-muted d-block">Note</small>
                                <span class="fst-italic text-dark">${prenotazione.note ? prenotazione.note : 'Nessuna nota'}</span>
                            </div>
                        </div>
                        <div class="mt-4 text-end">
                            <button class="btn btn-outline-danger" onclick="apriModalRestituzione('${prenotazione.prenotazione_id}')">
                                <i class="bi bi-arrow-return-left me-1"></i> Restituisci Veicolo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.html(cardHtml);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

// 1. SCARICA I DATI (AJAX)
function scaricaVeicoli() {
    $.ajax({
        url: '/getAllVeicoli',
        method: 'GET',
        dataType: 'json'
    }).done(function (res) {
        if (!res.success) return;

        // Salviamo tutti i veicoli nella variabile globale
        tuttiIVeicoli = res.veicoli;

        // Resettiamo alla pagina 1 e renderizziamo
        paginaCorrente = 1;
        renderizzaPagina();
    });
}

// 2. RENDERIZZA LA GRIGLIA (VISUALIZZAZIONE)
function renderizzaPagina() {
    const container = $("#containerVeicoli");
    container.empty();

    // Calcolo indici per lo slice (es. pag 1: da 0 a 6)
    const inizio = (paginaCorrente - 1) * ELEMENTI_PER_PAGINA;
    const fine = inizio + ELEMENTI_PER_PAGINA;

    // Prendo solo i veicoli della pagina corrente
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

        // Usa la variabile globale isNoleggioAttivo
        if (isNoleggioAttivo) {
            btnAttr = 'disabled';
            btnClass = 'btn-secondary';
            btnText = 'Noleggio attivo';
        } else if (!isAvailable) {
            btnAttr = 'disabled';
            btnClass = 'btn-light text-muted border';
            btnText = 'Non disponibile';
        }

        const card = `
        <div class="col">
            <div class="vehicle-card h-100">
                <div class="vehicle-img-wrapper">
                    <img src="${imgSrc}" alt="${v.modello}">
                    ${badgeHtml}
                </div>
                <div class="card-body-custom">
                    <h3 class="vehicle-title">${v.marca} ${v.modello}</h3>
                    <div class="vehicle-detail">
                        <i class="bi bi-123 text-primary"></i> 
                        <span>${v.targa}</span>
                    </div>
                    <div class="vehicle-detail">
                        <i class="bi bi-fuel-pump text-primary"></i> 
                        <span>${v.tipologia || 'Standard'}</span>
                    </div>
                </div>
                <div class="card-footer-custom">
                    <button class="btn ${btnClass} w-100 py-2 fw-semibold" 
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

    // Aggiorna i bottoni della paginazione
    renderizzaControlliPaginazione();
}

// 3. RENDERIZZA I BOTTONI (1, 2, Next...)
function renderizzaControlliPaginazione() {
    const navContainer = $('#paginationContainer');
    navContainer.empty();

    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);

    // Se c'è solo una pagina, nascondi la paginazione
    if (totalePagine <= 1) return;

    // Bottone Previous
    const prevDisabled = paginaCorrente === 1 ? 'disabled' : '';
    navContainer.append(`
        <li class="page-item ${prevDisabled}">
            <a class="page-link" href="#" onclick="cambiaPagina(${paginaCorrente - 1}); return false;">Precedente</a>
        </li>
    `);

    // Numeri Pagina
    for (let i = 1; i <= totalePagine; i++) {
        const activeClass = i === paginaCorrente ? 'active' : '';
        navContainer.append(`
            <li class="page-item ${activeClass}">
                <a class="page-link" href="#" onclick="cambiaPagina(${i}); return false;">${i}</a>
            </li>
        `);
    }

    // Bottone Next
    const nextDisabled = paginaCorrente === totalePagine ? 'disabled' : '';
    navContainer.append(`
        <li class="page-item ${nextDisabled}">
            <a class="page-link" href="#" onclick="cambiaPagina(${paginaCorrente + 1}); return false;">Successiva</a>
        </li>
    `);
}

// Funzione chiamata al click sui numeri
function cambiaPagina(nuovaPagina) {
    const totalePagine = Math.ceil(tuttiIVeicoli.length / ELEMENTI_PER_PAGINA);

    // Controlli di sicurezza
    if (nuovaPagina < 1 || nuovaPagina > totalePagine) return;

    paginaCorrente = nuovaPagina;
    renderizzaPagina(); // Ridisegna solo la griglia

    // Scrolla leggermente in alto verso l'inizio della lista (UX opzionale)
    $('html, body').animate({
        scrollTop: $("#containerVeicoli").offset().top - 100
    }, 500);
}

// --- RESTO DELLE FUNZIONI (Redirect, Modale, Restituzione) ---

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
            location.reload();
        } else {
            alert("Errore: " + res.message);
            $('#btnConfermaRestituzione').prop('disabled', false).text('Sì, Restituisci');
        }
    }).fail(function () {
        alert("Errore di connessione col server.");
        $('#btnConfermaRestituzione').prop('disabled', false).text('Sì, Restituisci');
    });
}