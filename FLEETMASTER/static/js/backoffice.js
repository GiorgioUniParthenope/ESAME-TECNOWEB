// NOTE: Global callback to handle asynchronous modal confirmation
let azioneDaConfermare = null;

// ==========================================
// PAGINATION CONFIG
// ==========================================
const ITEMS_PER_PAGE = 6;
let requestsData = []; // Store all requests here
let fleetData = [];    // Store all vehicles here

// ==========================================
// INIT & SECURITY
// ==========================================

$(function () {

    // --- JWT & ROLE CHECK ---
    const token = localStorage.getItem('jwt_token');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    // Frontend Security: Immediate redirect if not admin or token missing
    if (!token || userData.ruolo_nome !== 'admin') {
        console.warn("Unauthorized. Redirect.");
        window.location.href = !token ? '/login' : '/';
        return;
    }

    // --- AJAX SETUP ---
    // Inject Token into all requests
    $.ajaxSetup({
        beforeSend: (xhr) => xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    });

    // Global Error Handler (401/422 -> Forced Logout)
    $(document).ajaxError((e, jqXHR) => {
        if (window.location.pathname === '/login') return;
        if ([401, 422].includes(jqXHR.status)) {
            localStorage.clear();
            alert("Sessione scaduta.");
            window.location.href = '/login';
        }
    });

    // --- EVENTS ---
    caricaDatiAdmin();

    $('#addCarForm').on('submit', (e) => { e.preventDefault(); aggiungiVeicolo(); });
    $('#editCarForm').on('submit', (e) => { e.preventDefault(); modificaVeicolo(); });

    // Handle "Confirm" click in generic modal
    $('#btnConfermaAzione').on('click', function () {
        if (azioneDaConfermare) azioneDaConfermare();

        // FIX: Safely close Bootstrap instance
        const el = document.getElementById('modalConferma');
        (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).hide();
    });

    // --- TAB SWITCH LOGIC (Toggle Refresh Button) ---
    // Listens for tab show event
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        const targetId = $(e.target).attr('data-bs-target');

        // Show "Refresh" only if we are in Requests (#requests-content)
        if (targetId === '#requests-content') {
            $('#btnRefreshRequests').fadeIn();
        } else {
            $('#btnRefreshRequests').hide();
        }
    });
});

function caricaDatiAdmin() {
    caricaRichieste();
    caricaParco();
}

// ==========================================
// PRENOTAZIONI (WORKFLOW)
// ==========================================

function caricaRichieste() {
    caricamentoSpinner('#spinnerRequests', '#tableRequests', true);
    $('#noRequestsMsg').hide();
    $('#requestsPagination').empty(); // Clear pagination
    const tbody = $('#requestsBody').empty();

    $.get('/getAllPrenotazioniInAttesa', (res) => {

        // Empty State handling
        if (!res.success || !res.prenotazioni?.length) {
            $('#spinnerRequests').hide();
            $('#noRequestsMsg').fadeIn();
            $('#badgeRequests').hide();
            requestsData = [];
            return;
        }

        // Store data globally and render page 1
        requestsData = res.prenotazioni;
        $('#badgeRequests').text(requestsData.length).show();

        // Render first page
        renderizzaTabellaRichieste(1);

        caricamentoSpinner('#spinnerRequests', '#tableRequests', false);

    }).fail(() => {
        caricamentoSpinner('#spinnerRequests', '#tableRequests', false);
        mostraModalEsito("Errore", "Impossibile caricare richieste.", false);
    });
}

function renderizzaTabellaRichieste(page) {
    const tbody = $('#requestsBody').empty();

    // Calculate slice
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = requestsData.slice(start, end);

    pageItems.forEach(p => {
        tbody.append(`
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${p.username}</div>
                    <small class="text-muted">EMAIL: ${p.email}</small>
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
                    <button class="btn btn-sm btn-success me-1 shadow-sm" onclick="gestisciRichiesta('${p.id}', 'approva')">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-danger shadow-sm" onclick="gestisciRichiesta('${p.id}', 'rifiuta')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    // Render Pagination Controls
    paginazione('#requestsPagination', requestsData.length, page, 'renderizzaTabellaRichieste');
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
                caricaDatiAdmin(); // Refresh vehicle availability and requests
            } else {
                mostraModalEsito("Attenzione", res.message, false);
            }
        });
    });
}

// ==========================================
// FLOTTA (VEHICLE CRUD)
// ==========================================

function caricaParco() {
    $('#fleetBody').closest('.table-responsive').hide();
    $('#fleetPagination').empty();
    $('#spinnerFleet').show();

    const tbody = $('#fleetBody').empty();

    $.get('/getAllVeicoliAdmin', (res) => {
        $('#spinnerFleet').hide();
        $('#fleetBody').closest('.table-responsive').fadeIn();

        if (!res.success) {
            fleetData = [];
            return;
        }

        // Store data globally and render page 1
        fleetData = res.veicoli;
        costruisciTabellaParco(1);
    });
}

function costruisciTabellaParco(page) {
    const tbody = $('#fleetBody').empty();

    // Calculate slice
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = fleetData.slice(start, end);

    pageItems.forEach(v => {
        // UI Logic: Vehicle occupied -> Actions disabled
        const isOccupied = !v.stato_disponibile;
        const statusBadge = !isOccupied
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i> Disponibile</span>`
            : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i> Occupato</span>`;

        const disabledAttr = isOccupied ? 'disabled' : '';
        const tooltipAttr = isOccupied ? 'title="Veicolo in uso"' : '';
        const btnEditClass = isOccupied ? 'btn-outline-secondary' : 'btn-outline-warning';
        const btnDelClass = isOccupied ? 'btn-outline-secondary' : 'btn-outline-danger';

        // NOTE: Manual escape to pass JSON object in DOM onclick
        const dataVeicolo = JSON.stringify(v).replace(/"/g, '&quot;');

        tbody.append(`
            <tr>
                <td>
                    <div class="fw-bold text-dark">${v.marca} ${v.modello}</div>
                    <small class="text-muted text-uppercase" style="font-size: 0.75rem;">${v.tipologia}</small>
                </td>
                <td><span class="font-monospace bg-white border px-2 py-1 rounded text-dark">${v.targa}</span></td>
                <td>${statusBadge}</td>
                <td>${v.ultima_manutenzione ? new Date(v.ultima_manutenzione).toLocaleDateString('it-IT') : '-'}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm ${btnEditClass} me-1 shadow-sm" 
                            onclick="apriModalModifica(${dataVeicolo})" ${disabledAttr} ${tooltipAttr}>
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-sm ${btnDelClass} shadow-sm" 
                            onclick="richiediEliminazione('${v.veicolo_id}')" ${disabledAttr} ${tooltipAttr}>
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    // Render Pagination Controls
    paginazione('#fleetPagination', fleetData.length, page, 'costruisciTabellaParco');
}

// ==========================================
// PAGINATION HELPER
// ==========================================

/**
 * Generates Bootstrap pagination HTML.
 * @param {string} containerId - Selector for the pagination container (e.g. '#requestsPagination')
 * @param {number} totalItems - Total count of items
 * @param {number} currentPage - Current page number
 * @param {string} callbackName - Name of the function to call on click (string format)
 */
function paginazione(containerId, totalItems, currentPage, callbackName) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Only show pagination if more than 1 page (more than 6 items)
    if (totalPages <= 1) {
        $(containerId).empty();
        return;
    }

    let html = '<nav><ul class="pagination mb-0">';

    // Previous Button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="${callbackName}(${currentPage - 1})" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </button>
        </li>
    `;

    // Numbered Buttons
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `
            <li class="page-item ${activeClass}">
                <button class="page-link" onclick="${callbackName}(${i})">${i}</button>
            </li>
        `;
    }

    // Next Button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="${callbackName}(${currentPage + 1})" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </button>
        </li>
    `;

    html += '</ul></nav>';
    $(containerId).html(html);
}

// ==========================================
// FORM SUBMISSIONS & ACTIONS
// ==========================================

function aggiungiVeicolo() {
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
            // Close & Reset
            const el = document.getElementById('modalAddCar');
            (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).hide();
            $('#addCarForm')[0].reset();

            mostraModalEsito("Fatto", "Veicolo aggiunto.", true);
            caricaParco();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

function apriModalModifica(v) {
    // FIX: Timezone compensation for datetime-local input
    const rawDate = v.ultima_manutenzione;
    const dateObj = new Date(rawDate);
    dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());

    $('#editVeicoloId').val(v.veicolo_id);
    $('#editMarca').val(v.marca);
    $('#editModello').val(v.modello);
    $('#editTarga').val(v.targa);
    $('#editTipologia').val(v.tipologia);
    $('#editImg').val(v.immagine);
    $('#editManutenzione').val(dateObj.toISOString().slice(0, 16));

    new bootstrap.Modal('#modalEditCar').show();
}

function modificaVeicolo() {
    const dati = {
        veicolo_id: $('#editVeicoloId').val(),
        marca: $('#editMarca').val().trim(),
        modello: $('#editModello').val().trim(),
        targa: $('#editTarga').val().trim(),
        tipologia: $('#editTipologia').val(),
        immagine: $('#editImg').val().trim(),
        ultima_manutenzione: $('#editManutenzione').val()
    };

    $.ajax({
        url: '/modificaVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dati)
    }).done(res => {
        if (res.success) {
            const el = document.getElementById('modalEditCar');
            (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).hide();

            mostraModalEsito("Modificato", "Dati aggiornati.", true);
            caricaParco();
        } else {
            mostraModalEsito("Errore", res.message, false);
        }
    });
}

function richiediEliminazione(id) {
    mostraModalConferma("Eliminare definitivamente il veicolo?", () => {
        $.ajax({
            url: '/eliminaVeicolo',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ veicolo_id: id })
        }).done(res => {
            if (res.success) {
                mostraModalEsito("Eliminato", "Veicolo rimosso.", true);
                caricaParco();
            } else {
                mostraModalEsito("Errore", res.message, false);
            }
        });
    });
}

// ==========================================
// UTILS
// ==========================================

function caricamentoSpinner(idSpinner, idContenuto, mostra) {
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