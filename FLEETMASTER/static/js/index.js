// ==========================================
// STATE & CONFIG
// ==========================================
const ITEMS_PER_PAGE = 6;
const DEFAULT_IMG = 'https://img.freepik.com/free-psd/cartoon-modern-car-illustration_23-2151227151.jpg';

let tuttiIVeicoli = [];
let paginaCorrente = 1;
// Critical flag: if true, disables all "Book" buttons
let isNoleggioAttivo = false; 

// Temp refs for modals
let idRestituzione = null;
let idRifiuto = null;

// ==========================================
// INIT
// ==========================================
$(function () {
    const token = localStorage.getItem('jwt_token');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    // --- SECURITY CHECK ---
    if (!token) {
        window.location.href = '/login';
        return;
    }
    // Redirect Admin to Backoffice (they should not use the user frontend)
    if (userData.ruolo_nome === 'admin') {
        window.location.href = '/backoffice';
        return;
    }

    // --- AJAX SETUP ---
    $.ajaxSetup({
        beforeSend: (xhr) => xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    });

    // Forced logout on 401/422
    $(document).ajaxError((e, jqXHR) => {
        if (window.location.pathname === '/login') return;
        if ([401, 422].includes(jqXHR.status)) {
            localStorage.clear();
            alert("Sessione scaduta.");
            window.location.href = '/login';
        }
    });

    // --- START FLOW ---
    checkStatoUtente();

    // Modal event binding
    $('#btnConfermaRestituzione').click(() => idRestituzione && eseguiRestituzione(idRestituzione));
    $('#btnAckRifiuto').click(() => idRifiuto && cancellaPrenotazioneRifiutata(idRifiuto));
});

/* ==========================================
   CORE LOGIC
   ========================================== */

function checkStatoUtente() {
    // Determine layout: Simple List VS Active Rental Dashboard
    $.get('/getLastPrenotazione', (res) => {
        
        isNoleggioAttivo = false;
        $('#sezionePrenotazioneAttiva').hide();

        if (res?.success && res.prenotazione) {
            const p = res.prenotazione;

            // STATUS SWITCH
            switch (p.stato) {
                case 'prenotata':
                case 'approvata':
                    isNoleggioAttivo = true;
                    renderPrenotazioneAttiva(p);
                    break;
                case 'in attesa':
                    isNoleggioAttivo = true;
                    renderPrenotazioneInAttesa(p);
                    break;
                case 'rifiutata':
                    // NOTE: Partial block, but show modal immediately for ACK
                    isNoleggioAttivo = true; 
                    idRifiuto = p.prenotazione_id;
                    setTimeout(() => new bootstrap.Modal('#modalRifiuto').show(), 100);
                    break;
            }
        }
        
        // Load vehicles AFTER setting isNoleggioAttivo
        caricaParco();
    });
}

function caricaParco() {
    $.get('/getAllVeicoli', (res) => {
        if (!res.success) return;
        tuttiIVeicoli = res.veicoli;
        paginaCorrente = 1;
        renderizzaGrigliaVeicoli();
    });
}

/* ==========================================
   RENDERING LISTA
   ========================================== */

function renderizzaGrigliaVeicoli() {
    const container = $("#containerVeicoli").empty();
    const start = (paginaCorrente - 1) * ITEMS_PER_PAGE;
    const pageItems = tuttiIVeicoli.slice(start, start + ITEMS_PER_PAGE);

    pageItems.forEach(v => {
        const imgSrc = v.img || DEFAULT_IMG;
        const isAvailable = v.stato_disponibile;

        const badgeHtml = isAvailable
            ? `<span class="status-badge bg-success text-white"><i class="bi bi-check-circle me-1"></i>Disponibile</span>`
            : `<span class="status-badge bg-secondary text-white"><i class="bi bi-x-circle me-1"></i>Occupato</span>`;

        // Button logic:
        // 1. User has active rental -> Disabled (all)
        // 2. Vehicle occupied -> Disabled
        // 3. Else -> Primary Action
        let btnProps = { class: 'btn-primary', text: 'Prenota Ora', attr: '' };

        if (isNoleggioAttivo) {
            btnProps = { class: 'btn-secondary opacity-50', text: 'Noleggio in corso', attr: 'disabled' };
        } else if (!isAvailable) {
            btnProps = { class: 'btn-light text-muted border', text: 'Non disponibile', attr: 'disabled' };
        }

        const card = `
            <div class="col">
                <div class="vehicle-card h-100 shadow-sm border-0 transition-hover">
                    <div class="vehicle-img-wrapper">
                        <img src="${imgSrc}" alt="${v.modello}">
                        ${badgeHtml}
                    </div>
                    <div class="card-body-custom">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="vehicle-title text-truncate">${v.marca} ${v.modello}</h5>
                            <span class="badge bg-light text-dark border">${v.anno_immatricolazione || '2023'}</span>
                        </div>
                        <div class="mb-3">
                            <div class="vehicle-detail"><i class="bi bi-123 text-primary"></i> <span>${v.targa}</span></div>
                            <div class="vehicle-detail"><i class="bi bi-fuel-pump text-primary"></i> <span>${v.tipologia || 'Standard'}</span></div>
                        </div>
                        <div class="mt-auto">
                            <button class="btn ${btnProps.class} w-100 fw-semibold" onclick="vaiAPrenotazione('${v.veicolo_id}')" ${btnProps.attr}>
                                ${btnProps.text}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        container.append(card);
    });

    renderizzaPaginazione();
}

function renderizzaPaginazione() {
    const container = $('#paginationContainer').empty();
    const pages = Math.ceil(tuttiIVeicoli.length / ITEMS_PER_PAGE);

    if (pages <= 1) return;

    const mkLink = (p, txt, dis = false, act = false) => `
        <li class="page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}">
            <a class="page-link shadow-none" href="#" onclick="cambiaPagina(${p}); return false;">${txt}</a>
        </li>`;

    container.append(mkLink(paginaCorrente - 1, 'Precedente', paginaCorrente === 1));
    for (let i = 1; i <= pages; i++) container.append(mkLink(i, i, false, i === paginaCorrente));
    container.append(mkLink(paginaCorrente + 1, 'Successiva', paginaCorrente === pages));
}

function cambiaPagina(newPage) {
    const pages = Math.ceil(tuttiIVeicoli.length / ITEMS_PER_PAGE);
    if (newPage < 1 || newPage > pages) return;

    paginaCorrente = newPage;
    renderizzaGrigliaVeicoli();
    $('html, body').animate({ scrollTop: $("#sezioneListaVeicoli").offset().top - 100 }, 300);
}

/* ==========================================
   DASHBOARD COMPONENTS (Active/Pending)
   ========================================== */

function renderPrenotazioneAttiva(p) {
    const v = p.veicolo;
    const badgeClass = p.stato === 'approvata' ? 'bg-success' : 'bg-primary';
    const badgeText = p.stato === 'approvata' ? 'Approvata' : 'Noleggio Attivo';

    const html = `
        <div class="active-booking-card p-0 overflow-hidden mb-5 border border-primary border-opacity-25 shadow-sm rounded-4">
            <div class="row g-0">
                <div class="col-md-4 position-relative" style="min-height: 250px;">
                    <div class="position-absolute top-0 start-0 m-3 z-2">
                         <span class="badge ${badgeClass} px-3 py-2 shadow-sm">${badgeText}</span>
                    </div>
                    <img src="${v.img || DEFAULT_IMG}" class="position-absolute w-100 h-100 top-0 start-0" style="object-fit: cover;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <h5 class="card-title fw-bold fs-3 mb-1 text-dark">${v.marca} ${v.modello}</h5>
                        <p class="text-muted mb-4"><i class="bi bi-car-front me-1"></i> ${v.targa}</p>
                        
                        <div class="row g-3 mb-4">
                            <div class="col-sm-6">
                                <div class="p-3 bg-light rounded-3 border">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Ritiro</small>
                                    <div class="fw-semibold text-dark mt-1">${formatData(p.data_inizio)}</div>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <div class="p-3 bg-light rounded-3 border">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.75rem;">Consegna</small>
                                    <div class="fw-semibold text-dark mt-1">${formatData(p.data_fine)}</div>
                                </div>
                            </div>
                        </div>
                        <div class="text-end mt-auto">
                            <button class="btn btn-outline-danger px-4 py-2 fw-semibold" onclick="apriModalRestituzione('${p.prenotazione_id}')">
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

function renderPrenotazioneInAttesa(p) {
    const v = p.veicolo;
    const html = `
        <div class="active-booking-card p-0 overflow-hidden mb-5 border border-warning border-opacity-50 shadow-sm rounded-4">
            <div class="row g-0"> 
                <div class="col-md-4 position-relative" style="min-height: 250px;">
                    <div class="position-absolute top-0 start-0 m-3 z-2">
                         <span class="badge bg-warning text-dark px-3 py-2 shadow-sm"><i class="bi bi-hourglass-split me-1"></i> In Attesa</span>
                    </div>
                    <img src="${v.img || DEFAULT_IMG}" class="position-absolute w-100 h-100 top-0 start-0" style="object-fit: cover;">
                </div>
                <div class="col-md-8">
                    <div class="card-body p-4 d-flex flex-column justify-content-center h-100">
                        <div class="alert alert-warning d-flex align-items-center mb-3">
                            <i class="bi bi-info-circle-fill flex-shrink-0 me-2 fs-5"></i>
                            <div><strong>Richiesta inviata!</strong> In attesa di approvazione admin.</div>
                        </div>
                        <h5 class="card-title fw-bold fs-3 mb-1 text-dark">${v.marca} ${v.modello}</h5>
                        <p class="text-muted mb-0">Targa: <strong>${v.targa}</strong></p>
                        
                        <div class="mt-3 bg-light p-3 rounded border border-warning border-opacity-25">
                            <small class="text-muted d-block">Periodo Richiesto</small>
                            <span class="fw-semibold">Dal ${formatData(p.data_inizio)} al ${formatData(p.data_fine)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    $('#titoloSezionePrenotazione').html('<i class="bi bi-hourglass-split text-warning me-2"></i>Richiesta in Lavorazione');
    $('#containerTuaPrenotazione').html(html);
    $('#sezionePrenotazioneAttiva').fadeIn();
}

/* ==========================================
   ACTIONS & UTILS
   ========================================== */

function vaiAPrenotazione(id) {
    window.location.href = `/prenotazione?idveicolo=${id}`;
}

function apriModalRestituzione(id) {
    idRestituzione = id;
    new bootstrap.Modal('#modalRestituzione').show();
}

function eseguiRestituzione(id) {
    const btn = $('#btnConfermaRestituzione').prop('disabled', true).text('Elaborazione...');

    $.ajax({
        url: '/restituisciVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prenotazione_id: id })
    }).done(res => {
        if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalRestituzione')).hide();
            // Reload on success modal close
            const el = document.getElementById('modalSuccesso');
            el.addEventListener('hidden.bs.modal', () => location.reload());
            new bootstrap.Modal(el).show();
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
    const btn = $('#btnAckRifiuto').prop('disabled', true).text('Elaborazione...');

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
    });
}

function formatData(isoString) {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}