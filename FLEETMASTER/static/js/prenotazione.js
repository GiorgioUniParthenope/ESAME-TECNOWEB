$(function () {
    const params = new URLSearchParams(window.location.search);
    const idVeicolo = params.get('idveicolo');

    // 1. Inizializza i vincoli sulle date
    impostaVincoliDate();

    if (idVeicolo) {
        caricaDatiVeicolo(idVeicolo);
    } else {
        // Usa modale e redirige alla chiusura
        mostraErrore("Nessun veicolo selezionato!");
        const modalEl = document.getElementById('modalErrore');
        modalEl.addEventListener('hidden.bs.modal', function () {
            window.location.href = "/";
        }, { once: true });
    }
});

/**
 * Funzione helper per mostrare errori con la modale Bootstrap
 */
function mostraErrore(messaggio) {
    const modalEl = document.getElementById('modalErrore');
    const modalText = document.getElementById('modalErroreTesto');

    modalText.textContent = messaggio;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Gestisce la logica delle date:
 * - Data Inizio non può essere nel passato.
 * - Data Fine non può essere prima della Data Inizio.
 */
function impostaVincoliDate() {
    const dataInizioInput = document.getElementById('data_inizio');
    const dataFineInput = document.getElementById('data_fine');

    // Funzione helper per ottenere la data attuale in formato 'YYYY-MM-DDTHH:mm'
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const nowString = now.toISOString().slice(0, 16);

    // Imposta il minimo per la data inizio
    dataInizioInput.min = nowString;

    // EVENT LISTENER: Quando cambia la data inizio
    dataInizioInput.addEventListener('change', function () {
        if (this.value) {
            // La data fine deve essere almeno uguale alla data inizio
            dataFineInput.min = this.value;

            // Reset se data fine non valida
            if (dataFineInput.value && dataFineInput.value < this.value) {
                dataFineInput.value = "";
                mostraErrore("La data di fine è stata resettata perché precedente alla data di inizio.");
            }
        }
    });
}

function caricaDatiVeicolo(id) {
    fetch(`/veicolo/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const v = data.veicolo;
                document.getElementById('marca').value = v.marca;
                document.getElementById('modello').value = v.modello;
                document.getElementById('targa').value = v.targa;
                document.getElementById('tipologia').value = v.tipologia;
                document.getElementById('anno').value = v.anno;
                document.getElementById('ultima_manutenzione').value = v.ultima_manutenzione;
                document.getElementById('veicolo_id_hidden').value = v.veicolo_id;
            } else {
                mostraErrore("Errore nel caricamento del veicolo: " + data.message);
            }
        })
        .catch(err => console.error("Errore fetch:", err));
}

function inviaPrenotazione() {
    const userId = document.getElementById('user_id').value;
    const veicoloId = document.getElementById('veicolo_id_hidden').value;
    const dataInizioVal = document.getElementById('data_inizio').value;
    const dataFineVal = document.getElementById('data_fine').value;
    const note = document.getElementById('note').value;

    // 1. Controllo campi vuoti
    if (!dataInizioVal || !dataFineVal) {
        mostraErrore("Inserisci le date di inizio e fine per proseguire.");
        return;
    }

    // 2. Controllo logico date
    const dInizio = new Date(dataInizioVal);
    const dFine = new Date(dataFineVal);
    const dOggi = new Date();

    // Tolleranza di 1 minuto per evitare problemi con "adesso"
    if (dInizio < dOggi.setMinutes(dOggi.getMinutes() - 1)) {
        mostraErrore("La data di inizio non può essere nel passato.");
        return;
    }

    if (dFine <= dInizio) {
        mostraErrore("La data di restituzione deve essere successiva alla data di ritiro.");
        return;
    }

    const payload = {
        user_id: userId,
        veicolo_id: veicoloId,
        data_inizio: dataInizioVal,
        data_fine: dataFineVal,
        note: note
    };

    fetch('/prenotaVeicolo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const modalElement = document.getElementById('modalSuccesso');
                const myModal = new bootstrap.Modal(modalElement);
                myModal.show();

                modalElement.addEventListener('hidden.bs.modal', function () {
                    window.location.href = "/";
                });
            } else {
                mostraErrore("Impossibile completare la prenotazione: " + data.message);
            }
        })
        .catch(err => {
            console.error("Errore JS:", err);
            mostraErrore("Si è verificato un errore di connessione. Riprova più tardi.");
        });
}