/* static/js/prenotazione.js */

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
        // Fallback se ID mancante
        mostraErrore("Nessun veicolo selezionato!", true);
    }
});

// ==========================================
// LOGICA DATE & VALIDAZIONE
// ==========================================

function setupDateConstraints() {
    const elStart = document.getElementById('data_inizio');
    const elEnd = document.getElementById('data_fine');

    // Calcolo timestamp locale ISO per il "min" (evita selezione passato)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowString = now.toISOString().slice(0, 16);

    elStart.min = nowString;

    // Listener cambio data inizio -> aggiorna vincolo data fine
    elStart.addEventListener('change', function () {
        if (this.value) {
            elEnd.min = this.value;

            // Reset data fine se incongruente (fine < inizio)
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
    fetch(`/veicolo/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                popolaFormVeicolo(data.veicolo);
            } else {
                mostraErrore("Errore caricamento veicolo: " + data.message);
            }
        })
        .catch(err => console.error("Fetch Error:", err));
}

function inviaPrenotazione() {
    const userId = document.getElementById('user_id').value;
    const veicoloId = document.getElementById('veicolo_id_hidden').value;
    const dataInizio = document.getElementById('data_inizio').value;
    const dataFine = document.getElementById('data_fine').value;
    const note = document.getElementById('note').value;

    // Validazione Client-Side
    if (!validatePrenotazione(dataInizio, dataFine)) return;

    const payload = {
        user_id: userId,
        veicolo_id: veicoloId,
        data_inizio: dataInizio,
        data_fine: dataFine,
        note: note
    };

    // Invio Request
    fetch('/prenotaVeicolo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                handleSuccessoPrenotazione();
            } else {
                mostraErrore("Impossibile completare la prenotazione: " + data.message);
            }
        })
        .catch(err => {
            console.error("Network Error:", err);
            mostraErrore("Errore di connessione. Riprova più tardi.");
        });
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

    // Check tolleranza passato (1 min buffer)
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
    const modalEl = document.getElementById('modalSuccesso');
    const modal = new bootstrap.Modal(modalEl);

    // Redirect alla home dopo chiusura modal
    modalEl.addEventListener('hidden.bs.modal', () => {
        window.location.href = "/";
    }, { once: true });

    modal.show();
}

function mostraErrore(messaggio, redirectOnClose = false) {
    const modalEl = document.getElementById('modalErrore');
    document.getElementById('modalErroreTesto').textContent = messaggio;

    if (redirectOnClose) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            window.location.href = "/";
        }, { once: true });
    }

    new bootstrap.Modal(modalEl).show();
}