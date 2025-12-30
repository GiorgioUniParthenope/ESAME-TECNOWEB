/* static/js/prenotazione.js */

// ==========================================
// CONFIGURAZIONE & JWT (ROBUSTA)
// ==========================================
const token = localStorage.getItem('jwt_token');

// DEBUG: Controllo in console
console.log("[Prenotazione] Token:", token);

// 1. Check Token immediato (Stringente)
if (!token || token === "null" || token === "undefined") {
    console.warn("Token mancante o invalido. Redirect login.");
    alert("Devi effettuare il login per prenotare.");
    window.location.href = '/login';
}

// 2. Header pronti per Fetch
const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
};

// ==========================================
// INIT & SETUP
// ==========================================

$(function () {
    const params = new URLSearchParams(window.location.search);
    const idVeicolo = params.get('idveicolo');

    // Inizializzazione vincoli input date
    setupDateConstraints();

    // Check parametro obbligatorio
    if (idVeicolo) {
        loadVeicoloData(idVeicolo);
    } else {
        mostraErrore("Nessun veicolo selezionato!", true);
    }

    // Binding bottone invio
    $('#btnConfermaPrenotazione').click(inviaPrenotazione);
});

// ==========================================
// LOGICA DATE & VALIDAZIONE
// ==========================================

function setupDateConstraints() {
    const elStart = document.getElementById('data_inizio');
    const elEnd = document.getElementById('data_fine');

    // Calcolo timestamp locale ISO per il "min"
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowString = now.toISOString().slice(0, 16);

    elStart.min = nowString;

    // Listener cambio data inizio
    elStart.addEventListener('change', function () {
        if (this.value) {
            elEnd.min = this.value;

            // Reset data fine se incongruente
            if (elEnd.value && elEnd.value < this.value) {
                elEnd.value = "";
                mostraErrore("La data di fine è stata resettata perché precedente all'inizio.");
            }
        }
    });
}

// ==========================================
// API CALLS (FETCH)
// ==========================================

function loadVeicoloData(id) {
    fetch(`/veicolo/${id}`, { headers: authHeaders })
        .then(res => {
            if (res.status === 401) throw new Error("Token scaduto");
            return res.json();
        })
        .then(data => {
            if (data.success) {
                popolaFormVeicolo(data.veicolo);
            } else {
                mostraErrore("Errore caricamento veicolo: " + data.message);
            }
        })
        .catch(err => handleApiError(err));
}

function inviaPrenotazione() {
    // Recupero dati utente dal localStorage
    let userId = null;
    try {
        const userData = JSON.parse(localStorage.getItem('user_data'));
        userId = userData ? userData.user_id : null;
        console.log("[Prenotazione] User ID recuperato:", userId);
    } catch (e) {
        console.error("Errore parsing user_data", e);
    }

    const veicoloId = document.getElementById('veicolo_id_hidden').value;
    const dataInizio = document.getElementById('data_inizio').value;
    const dataFine = document.getElementById('data_fine').value;
    const note = document.getElementById('note').value;

    // Validazione Client-Side
    if (!validatePrenotazione(dataInizio, dataFine)) return;

    const payload = {
        user_id: userId, // Backend usa il token, ma passarlo è safe
        veicolo_id: veicoloId,
        data_inizio: dataInizio,
        data_fine: dataFine,
        note: note
    };

    // Invio Request
    fetch('/prenotaVeicolo', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
    })
        .then(res => {
            if (res.status === 401) throw new Error("Token scaduto");
            return res.json();
        })
        .then(data => {
            if (data.success) {
                handleSuccessoPrenotazione();
            } else {
                mostraErrore("Impossibile completare la prenotazione: " + data.message);
            }
        })
        .catch(err => handleApiError(err));
}

// ==========================================
// UI & HELPERS
// ==========================================

function popolaFormVeicolo(v) {
    document.getElementById('marca').value = v.marca;
    document.getElementById('modello').value = v.modello;
    document.getElementById('targa').value = v.targa;
    document.getElementById('tipologia').value = v.tipologia;
    document.getElementById('anno').value = v.anno;
    document.getElementById('ultima_manutenzione').value = v.ultima_manutenzione;
    document.getElementById('veicolo_id_hidden').value = v.veicolo_id;
}

function validatePrenotazione(start, end) {
    if (!start || !end) {
        mostraErrore("Inserisci le date di inizio e fine per proseguire.");
        return false;
    }

    const dStart = new Date(start);
    const dEnd = new Date(end);
    const dNow = new Date();

    if (dStart < dNow.setMinutes(dNow.getMinutes() - 1)) {
        mostraErrore("La data di inizio non può essere nel passato.");
        return false;
    }

    if (dEnd <= dStart) {
        mostraErrore("La data di restituzione deve essere successiva al ritiro.");
        return false;
    }

    return true;
}

function handleSuccessoPrenotazione() {
    // Verifica se la modale esiste nel DOM
    const modalEl = document.getElementById('modalSuccesso');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('hidden.bs.modal', () => {
            window.location.href = "/";
        }, { once: true });
        modal.show();
    } else {
        // Fallback se la modale non c'è
        alert("Prenotazione effettuata con successo!");
        window.location.href = "/";
    }
}

function mostraErrore(messaggio, redirectOnClose = false) {
    const modalEl = document.getElementById('modalErrore');
    if (!modalEl) {
        alert(messaggio);
        if (redirectOnClose) window.location.href = '/';
        return;
    }

    document.getElementById('modalErroreTesto').textContent = messaggio;

    if (redirectOnClose) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            window.location.href = "/";
        }, { once: true });
    }

    new bootstrap.Modal(modalEl).show();
}

function handleApiError(err) {
    console.error("API Error:", err);
    if (err.message === "Token scaduto") {
        alert("Sessione scaduta. Rifai il login.");
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
    } else {
        mostraErrore("Errore di comunicazione col server.");
    }
}