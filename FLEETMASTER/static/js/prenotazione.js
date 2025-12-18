$(function () {
    const params = new URLSearchParams(window.location.search);
    const idVeicolo = params.get('idveicolo');

    if (idVeicolo) {
        caricaDatiVeicolo(idVeicolo);
    } else {
        alert("Nessun veicolo selezionato!");
        window.location.href = "/";
    }
});

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
                alert("Errore nel caricamento del veicolo: " + data.message);
            }
        })
        .catch(err => console.error("Errore fetch:", err));
}

function inviaPrenotazione() {
    const payload = {
        user_id: document.getElementById('user_id').value,
        veicolo_id: document.getElementById('veicolo_id_hidden').value,
        data_inizio: document.getElementById('data_inizio').value,
        data_fine: document.getElementById('data_fine').value,
        note: document.getElementById('note').value
    };

    if (!payload.data_inizio || !payload.data_fine) {
        alert("Inserisci le date di inizio e fine.");
        return;
    }

    fetch('/prenotaVeicolo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Recuperiamo l'elemento modale corretto dal DOM
                const modalElement = document.getElementById('modalSuccesso');
                const myModal = new bootstrap.Modal(modalElement);

                // Mostriamo il modale
                myModal.show();

                // Reindirizziamo l'utente SOLO quando il modale viene chiuso
                // (sia col tasto OK, sia cliccando fuori, sia con la X)
                modalElement.addEventListener('hidden.bs.modal', function () {
                    window.location.href = "/";
                });

            } else {
                alert("Errore: " + data.message);
            }
        })
        .catch(err => {
            console.error("Errore JS:", err);
            alert("Si è verificato un errore di connessione o nel codice client.");
        });
}