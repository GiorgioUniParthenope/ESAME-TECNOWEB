// ==========================================
// INIT & SECURITY
// ==========================================

$(function () {
    const token = localStorage.getItem('jwt_token');

    // 1. Security Check
    if (!token) {
        alert("Login necessario.");
        window.location.href = '/login';
        return;
    }

    // 2. Global Ajax Setup
    $.ajaxSetup({
        beforeSend: (xhr) => xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    });

    // 3. UI Setup
    const params = new URLSearchParams(window.location.search);
    const idVeicolo = params.get('idveicolo');

    inizializzaDatiPrenotazione();

    if (idVeicolo) {
        caricamentoDatiVeicolo(idVeicolo);
    } else {
        mostraErrore("Nessun veicolo selezionato.", true);
    }

    // 4. Bind Submit
    $('#btnConfermaPrenotazione').on('click', inviaPrenotazione);
});

// ==========================================
// DATE LOGIC & VALIDATION
// ==========================================

function inizializzaDatiPrenotazione() {
    const $start = $('#data_inizio');
    const $end = $('#data_fine');

    // FIX: Timezone offset hack for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowIso = now.toISOString().slice(0, 16);

    // Set minimum to "now"
    $start.attr('min', nowIso);

    // Chain: When Start changes -> Update Min End
    $start.on('change', function () {
        const val = $(this).val();
        if (val) {
            $end.attr('min', val);
            
            // If End date is before Start date, reset it
            if ($end.val() && $end.val() < val) {
                $end.val('');
                mostraErrore("La data di fine è stata corretta.");
            }
        }
    });
}

function validatePrenotazione(start, end) {
    if (!start || !end) {
        mostraErrore("Inserisci entrambe le date.");
        return false;
    }

    const dStart = new Date(start);
    const dEnd = new Date(end);
    const dNow = new Date();

    // 1 min tolerance to avoid blocking due to slow clicks/latency
    if (dStart < dNow.setMinutes(dNow.getMinutes() - 1)) {
        mostraErrore("La data di inizio è nel passato.");
        return false;
    }

    if (dEnd <= dStart) {
        mostraErrore("La data di restituzione deve essere successiva al ritiro.");
        return false;
    }

    return true;
}

// ==========================================
// API CALLS
// ==========================================

function caricamentoDatiVeicolo(id) {
    $.get(`/veicolo/${id}`)
        .done(res => {
            if (res.success) {
                popolaFormVeicolo(res.veicolo);
            } else {
                mostraErrore("Veicolo non trovato.", true);
            }
        })
        .fail(() => mostraErrore("Errore recupero dati veicolo.", true));
}

function inviaPrenotazione() {
    const vId = $('#veicolo_id_hidden').val();
    const start = $('#data_inizio').val();
    const end = $('#data_fine').val();
    const note = $('#note').val();

    if (!validatePrenotazione(start, end)) return;

    // NOTE: Do not send user_id, backend extracts it safely from JWT Token
    const payload = {
        veicolo_id: vId,
        data_inizio: start,
        data_fine: end,
        note: note
    };
    
    // UI Loading state
    const $btn = $('#btnConfermaPrenotazione').prop('disabled', true).text('Attendi...');

    $.ajax({
        url: '/prenotaVeicolo',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    })
    .done(res => {
        if (res.success) {
            handleSuccesso();
        } else {
            mostraErrore(res.message);
            $btn.prop('disabled', false).text('Conferma Prenotazione');
        }
    })
    .fail(err => {
        // Standard API error handling
        const msg = err.responseJSON?.message || "Errore server.";
        mostraErrore(msg);
        $btn.prop('disabled', false).text('Conferma Prenotazione');
    });
}

// ==========================================
// UI HELPERS
// ==========================================

function popolaFormVeicolo(v) {
    $('#marca').val(v.marca);
    $('#modello').val(v.modello);
    $('#targa').val(v.targa);
    $('#tipologia').val(v.tipologia);
    $('#anno').val(v.anno);
    $('#ultima_manutenzione').val(v.ultima_manutenzione);
    $('#veicolo_id_hidden').val(v.veicolo_id);
}

function handleSuccesso() {
    const modalEl = document.getElementById('modalSuccesso');
    // Redirect upon modal closure
    modalEl.addEventListener('hidden.bs.modal', () => window.location.href = "/", { once: true });
    new bootstrap.Modal(modalEl).show();
}

function mostraErrore(msg, redirect = false) {
    const modalEl = document.getElementById('modalErrore');
    
    // Fallback if modal does not exist in DOM
    if (!modalEl) {
        alert(msg);
        if (redirect) window.location.href = '/';
        return;
    }

    $('#modalErroreTesto').text(msg);
    if (redirect) {
        modalEl.addEventListener('hidden.bs.modal', () => window.location.href = "/", { once: true });
    }
    new bootstrap.Modal(modalEl).show();
}