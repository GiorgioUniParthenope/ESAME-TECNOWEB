from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from model import db, Utente, TipologiaVeicolo, Veicolo, Prenotazione, LogOperazione, Ruolo
from route.login_required import login_required
from datetime import datetime
from werkzeug.security import check_password_hash
import uuid

app = Flask(__name__)

app.secret_key = "chiave_super_segreta"

# Configurazione Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:JwCsDhwQADBtHgMYmzCbPRbgIBwDnvxq@tramway.proxy.rlwy.net:20962/railway'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# --- FUNZIONI UTILITY ---

def get_admin_role_id():
    """Recupera dinamicamente l'ID del ruolo 'Admin' dal DB."""
    try:
        # Assicurati che nel DB il ruolo si chiami esattamente 'Admin' (maiuscola/minuscola contano)
        ruolo_admin = Ruolo.query.filter_by(nome_ruolo='admin').first() 
        if ruolo_admin:
            return str(ruolo_admin.ruolo_id)
    except Exception as e:
        print(f"Errore recupero ruolo Admin: {e}")
    return None

def get_role_name_by_id(role_id):
    """Recupera il nome del ruolo dato l'ID."""
    try:
        ruolo = Ruolo.query.get(role_id)
        if ruolo:
            return ruolo.nome_ruolo
    except:
        pass
    return None

# ==========================
# HOME PAGE
# ==========================
@app.route('/')
def index():
    if "user" not in session:
        return redirect(url_for('login_page'))
    
    admin_id = get_admin_role_id()
    
    # Se è Admin, mostra il backoffice
    # Convertiamo entrambi in stringa per sicurezza nel confronto
    if str(session['user'].get('ruolo_id')) == str(admin_id):
        return render_template('backoffice.html', user=session['user'])
    
    return render_template('index.html', user=session['user'])

# ==========================
# PAGINA LOGIN (GET)
# ==========================
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

# ==========================
# LOGIN API (POST JSON)
# ==========================
@app.route('/login', methods=['POST'])
def login_post():
    data = request.get_json()
    email = data.get('email') 
    password = data.get('password')

    utente = Utente.query.filter_by(email=email).first()

    if utente and check_password_hash(utente.password_hash, password):
        session['user'] = utente.to_dict()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Credenziali errate"}), 401

# ==========================
# LOGOUT
# ==========================
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login_page'))

# ==========================
# PRENOTAZIONE PAGE (Frontend)
# ==========================
@app.route('/prenotazione', methods=['GET'])
@login_required
def prenotazione_page():
    if "user" in session:
        return render_template('prenotazione.html', user=session['user'])
    return redirect(url_for('login_page'))

# ==========================
# API UTENTE: GET VEICOLI (FILTRATI PER RUOLO E PRIORITÀ TIPOLOGIA)
# ==========================
@app.route('/getAllVeicoli', methods=['GET'])
@login_required 
def get_veicoli_disponibili():
    try:
        user_role_id = session['user'].get('ruolo_id')
        role_name = get_role_name_by_id(user_role_id)
        
        # Iniziamo la query facendo una JOIN con TipologiaVeicolo
        # Selezioniamo solo i veicoli disponibili
        query = db.session.query(Veicolo).join(TipologiaVeicolo).filter(Veicolo.stato_disponibile == True)

        # FILTRO LOGICO IN BASE AL RUOLO E ALLA PRIORITÀ DELLA TIPOLOGIA
        if role_name == 'admin':
            # L'Admin vede TUTTO (anche se non ha tipologia, quindi usiamo query base senza join forzata se necessario, 
            # ma qui assumiamo che tutti i veicoli abbiano una tipologia).
            # Se vuoi che l'admin veda anche veicoli senza tipologia, dovresti fare una query separata o outerjoin.
            # Qui mantengo la logica standard: Admin vede tutto ciò che è disponibile.
            query = Veicolo.query.filter_by(stato_disponibile=True)

        elif role_name == 'impiegato':
            # Impiegato vede solo Tipologie con priorita = 1
            query = query.filter(TipologiaVeicolo.priorita == 1)

        elif role_name == 'manager':
            # Manager vede solo Tipologie con priorita = 2
            query = query.filter(TipologiaVeicolo.priorita.in_([1, 2]))

        else:
            # Fallback per ruoli sconosciuti: vede solo priorità 1 (o niente, a scelta)
            query = query.filter(TipologiaVeicolo.priorita == 1)

        veicoli = query.all()
        
        veicoli_lista = []
        for v in veicoli:
            img = "N/D"
            
            # Recupero dati tipologia (se serve mostrarli)
            nome_tipologia = "N/D"
            priorita_tipologia = 0
            
            if v.tipologia_id:
                # Nota: se abbiamo fatto la join nella query, l'oggetto v è il Veicolo, 
                # possiamo accedere alla relazione se configurata nel model, o rifare la query get.
                # Qui uso get per sicurezza dato che l'oggetto potrebbe venire da query diverse.
                tipo_obj = TipologiaVeicolo.query.get(v.tipologia_id)
                if tipo_obj:
                    nome_tipologia = tipo_obj.nome
                    priorita_tipologia = getattr(tipo_obj, 'priorita', 0)

            veicoli_lista.append({
                "veicolo_id": str(v.veicolo_id),
                "targa": v.targa,
                "modello": v.modello,
                "marca": v.marca,
                "anno_immatricolazione": v.anno_immatricolazione,
                "stato_disponibile": v.stato_disponibile,
                "tipologia": nome_tipologia,
                "priorita": priorita_tipologia, # Utile per debug frontend
                "img": v.url_immagine,
                "ultima_manutenzione": v.ultima_manutenzione.isoformat() if v.ultima_manutenzione else None
            })
            
        return jsonify({"success": True, "veicoli": veicoli_lista}), 200
        
    except Exception as e:
        print("Errore get_veicoli_disponibili:", str(e))
        return jsonify({"success": False, "message": "Errore interno server"}), 500

# ==========================
# API UTENTE: PRENOTA VEICOLO
# ==========================
@app.route('/prenotaVeicolo', methods=['POST'])
@login_required
def prenota_veicolo():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        veicolo_id = data.get('veicolo_id')
        data_inizio = data.get('data_inizio')
        data_fine = data.get('data_fine')
        note = data.get('note', '')

        if not all([user_id, veicolo_id, data_inizio, data_fine]):
            return jsonify({"success": False, "message": "Dati mancanti"}), 400

        # 1. CANCELLA LE PRECEDENTI PRENOTAZIONI DELL'UTENTE
        Prenotazione.query.filter_by(user_id=user_id).delete()

        # 2. GESTIONE CONCORRENZA (Resource Locking)
        veicolo = Veicolo.query.filter_by(veicolo_id=veicolo_id).with_for_update().first()

        if not veicolo:
            db.session.rollback()
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404

        if not veicolo.stato_disponibile:
            db.session.rollback()
            return jsonify({"success": False, "message": "Veicolo non più disponibile"}), 400

        # 3. CREAZIONE PRENOTAZIONE
        prenotazione = Prenotazione(
            user_id=user_id,
            veicolo_id=veicolo_id,
            data_inizio=datetime.fromisoformat(data_inizio),
            data_fine=datetime.fromisoformat(data_fine),
            stato='in attesa', 
            note=note
        )
        db.session.add(prenotazione)

        # 4. AGGIUNTA LOG OPERAZIONE (Storico)
        log = LogOperazione(
            user_id=user_id,
            azione='Richiesta Prenotazione',
            descrizione=f"Richiesta per {veicolo.marca} {veicolo.modello} ({veicolo.targa}). Note: {note}"
        )
        db.session.add(log)

        db.session.commit()
        
        return jsonify({"success": True, "message": "Richiesta inviata, in attesa di approvazione"}), 200

    except Exception as e:
        db.session.rollback()
        print("Errore prenotazione:", e)
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: GET ALL VEICOLI (Per Backoffice - TUTTI)
# ==========================
@app.route('/getAllVeicoliAdmin', methods=['GET'])
@login_required
def get_all_veicoli_admin():
    # Verifica Ruolo Admin Dinamico
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403
    
    try:
        # L'admin vede tutto, usiamo query base
        veicoli = Veicolo.query.all()
        veicoli_lista = []
        for v in veicoli:
            img = getattr(v, 'immagine', None)
            
            nome_tipologia = "N/D"
            priorita = "N/D"
            if v.tipologia_id:
                tipo_obj = TipologiaVeicolo.query.get(v.tipologia_id)
                if tipo_obj:
                    nome_tipologia = tipo_obj.nome
                    priorita = getattr(tipo_obj, 'priorita', 'N/D')

            veicoli_lista.append({
                "veicolo_id": str(v.veicolo_id),
                "targa": v.targa,
                "modello": v.modello,
                "marca": v.marca,
                "tipologia": nome_tipologia,
                "priorita": priorita, # Mostriamo la priorità all'admin prendendola dalla tipologia
                "immagine": img,
                "stato_disponibile": v.stato_disponibile
            })
        return jsonify({"success": True, "veicoli": veicoli_lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: AGGIUNGI VEICOLO
# ==========================
@app.route('/aggiungiVeicolo', methods=['POST'])
@login_required
def aggiungi_veicolo():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403

    data = request.get_json()
    
    marca = data.get('marca')
    modello = data.get('modello')
    targa = data.get('targa')
    tipologia_input = data.get('tipologia')
    immagine = data.get('immagine')
    # Nota: la priorità NON si salva qui, perché dipende dalla tipologia scelta

    if not marca or not targa:
        return jsonify({'success': False, 'message': 'Marca e Targa sono obbligatorie'}), 400

    try:
        tipologia_id_db = None
        if tipologia_input:
            tipo_obj = TipologiaVeicolo.query.filter_by(nome=tipologia_input).first()
            if not tipo_obj:
                 return jsonify({'success': False, 'message': f'Tipologia "{tipologia_input}" non trovata nel database'}), 400
            tipologia_id_db = tipo_obj.id

        nuovo_veicolo = Veicolo(
            marca=marca,
            modello=modello,
            targa=targa,
            tipologia_id=tipologia_id_db,
            stato_disponibile=True,
            anno_immatricolazione=datetime.now().year,
            ultima_manutenzione=datetime.now(),
            url_immagine=immagine
        )
        
        if hasattr(Veicolo, 'immagine'):
            nuovo_veicolo.url_immagine = immagine

        db.session.add(nuovo_veicolo)
        db.session.commit()
        return jsonify({"success": True, "message": "Veicolo aggiunto"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: MODIFICA VEICOLO
# ==========================
@app.route('/modificaVeicolo', methods=['POST'])
@login_required
def modifica_veicolo():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403

    data = request.get_json()
    veicolo_id = data.get('veicolo_id')
    tipologia_input = data.get('tipologia')

    try:
        veicolo = Veicolo.query.get(veicolo_id)
        if not veicolo:
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404

        veicolo.marca = data.get('marca')
        veicolo.modello = data.get('modello')
        veicolo.targa = data.get('targa')
        
        if tipologia_input:
            tipo_obj = TipologiaVeicolo.query.filter_by(nome=tipologia_input).first()
            if not tipo_obj:
                 return jsonify({'success': False, 'message': f'Tipologia "{tipologia_input}" non trovata nel database'}), 400
            veicolo.tipologia_id = tipo_obj.id
        
        if hasattr(veicolo, 'immagine'):
            veicolo.immagine = data.get('immagine')

        db.session.commit()
        return jsonify({"success": True, "message": "Veicolo aggiornato"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: ELIMINA VEICOLO
# ==========================
@app.route('/eliminaVeicolo', methods=['POST'])
@login_required
def elimina_veicolo():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403

    data = request.get_json()
    try:
        veicolo = Veicolo.query.get(data.get('veicolo_id'))
        if not veicolo:
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404
            
        db.session.delete(veicolo)
        db.session.commit()
        return jsonify({"success": True, "message": "Veicolo eliminato"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: GET RICHIESTE IN ATTESA
# ==========================
@app.route('/getAllPrenotazioniInAttesa', methods=['GET'])
@login_required
def get_all_prenotazioni_in_attesa():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403
        
    try:
        risultati = db.session.query(Prenotazione, Utente, Veicolo)\
            .join(Utente, Prenotazione.user_id == Utente.user_id)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.stato == 'in attesa').all()

        lista = []
        for p, u, v in risultati:
            lista.append({
                "id": p.prenotazione_id,
                "user_id": str(u.user_id),
                "username": u.nome,
                "marca": v.marca,
                "modello": v.modello,
                "targa": v.targa,
                "data_inizio": p.data_inizio.isoformat(),
                "created_at": p.data_inizio.isoformat(),
                "note": p.note
            })
        return jsonify({"success": True, "prenotazioni": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API ADMIN: APPROVA / RIFIUTA
# ==========================
@app.route('/approvaPrenotazione', methods=['POST'])
@login_required
def approva_prenotazione():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403
    return gestisci_stato_prenotazione(request, 'approvata')

@app.route('/rifiutaPrenotazione', methods=['POST'])
@login_required
def rifiuta_prenotazione():
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) != str(admin_id):
        return jsonify({"success": False, "message": "Non autorizzato"}), 403
    return gestisci_stato_prenotazione(request, 'rifiutata')

def gestisci_stato_prenotazione(req, nuovo_stato):
    try:
        data = req.get_json()
        p_id = data.get('prenotazione_id')
        
        prenotazione = Prenotazione.query.get(p_id)
        if not prenotazione:
            return jsonify({"success": False, "message": "Prenotazione non trovata"}), 404

        prenotazione.stato = nuovo_stato
        
        if nuovo_stato == 'approvata':
            veicolo = Veicolo.query.get(prenotazione.veicolo_id)
            if veicolo:
                veicolo.stato_disponibile = False
        
        db.session.commit()
        return jsonify({"success": True, "message": f"Prenotazione {nuovo_stato}"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================
# API UTENTE: GET ULTIMA PRENOTAZIONE
# ==========================
@app.route('/getLastPrenotazione', methods=['GET'])
@login_required
def get_ultima_prenotazione():
    try:
        user_id = session['user']['user_id']
        stati_attivi = ['in attesa', 'approvata', 'prenotata', 'rifiutata']

        result = db.session.query(Prenotazione, Veicolo)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.user_id == user_id)\
            .filter(Prenotazione.stato.in_(stati_attivi))\
            .order_by(Prenotazione.data_inizio.desc())\
            .first()

        if not result:
            return jsonify({"success": False, "message": "Nessuna prenotazione attiva"}), 200

        prenotazione, veicolo = result
        img = getattr(veicolo, 'immagine', None)

        data = {
            "prenotazione_id": str(prenotazione.prenotazione_id),
            "data_inizio": prenotazione.data_inizio.isoformat(),
            "data_fine": prenotazione.data_fine.isoformat(),
            "stato": prenotazione.stato,
            "note": prenotazione.note,
            "veicolo": {
                "marca": veicolo.marca,
                "modello": veicolo.modello,
                "targa": veicolo.targa,
                "img": img
            }
        }
        return jsonify({"success": True, "prenotazione": data}), 200

    except Exception as e:
        print(f"Errore recupero ultima prenotazione: {e}")
        return jsonify({"success": False, "message": "Errore server"}), 500

# ==========================
# API UTENTE: RESTITUZIONE
# ==========================
@app.route('/restituisciVeicolo', methods=['POST'])
@login_required
def restituisci_veicolo():
    try:
        data = request.get_json()
        prenotazione_id = data.get('prenotazione_id')

        prenotazione = Prenotazione.query.get(prenotazione_id)
        if not prenotazione:
            return jsonify({"success": False, "message": "Prenotazione non trovata"}), 404
            
        if str(prenotazione.user_id) != str(session['user']['user_id']):
             return jsonify({"success": False, "message": "Non autorizzato"}), 403

        if prenotazione.stato not in ['prenotata', 'approvata']:
            return jsonify({"success": False, "message": "Prenotazione non attiva"}), 400

        prenotazione.stato = 'conclusa'
        prenotazione.data_fine = datetime.now()

        veicolo = Veicolo.query.get(prenotazione.veicolo_id)
        if veicolo:
            veicolo.stato_disponibile = True

        db.session.commit()
        return jsonify({"success": True, "message": "Veicolo restituito"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API: GET VEICOLO BY ID
# ==========================
@app.route('/veicolo/<veicolo_id>', methods=['GET'])
@login_required
def get_veicolo_by_id(veicolo_id):
    try:
        veicolo = Veicolo.query.get(veicolo_id)
        if not veicolo:
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404

        veicolo_data = {
            "veicolo_id": str(veicolo.veicolo_id),
            "marca": veicolo.marca,
            "modello": veicolo.modello,
            "targa": veicolo.targa,
            "anno": veicolo.anno_immatricolazione,
            "stato": "Disponibile" if veicolo.stato_disponibile else "Non Disponibile",
            "ultima_manutenzione": veicolo.ultima_manutenzione.isoformat() if veicolo.ultima_manutenzione else "Mai effettuata",
            "tipologia": veicolo.tipologia_id if veicolo.tipologia_id else "N/D"
        }

        return jsonify({"success": True, "veicolo": veicolo_data}), 200

    except Exception as e:
        print(f"Errore recupero veicolo: {e}")
        return jsonify({"success": False, "message": "Errore server"}), 500


# ==========================
# API: GET TUTTE LE TIPOLOGIE (Utility per frontend)
# ==========================
@app.route('/getAllTipologie', methods=['GET'])
def get_all_tipologie():
    try:
        tipologie = TipologiaVeicolo.query.all()
        lista = [{"id": str(t.id), "nome": t.nome} for t in tipologie]
        return jsonify({"success": True, "tipologie": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================
# API UTENTE: CONFERMA VISIONE RIFIUTO
# ==========================
@app.route('/confermaVisioneRifiuto', methods=['POST'])
@login_required
def conferma_visione_rifiuto():
    try:
        data = request.get_json()
        prenotazione_id = data.get('prenotazione_id')
        user_id = session['user']['user_id']

        if not prenotazione_id:
            return jsonify({'success': False, 'message': 'ID prenotazione mancante'}), 400

        prenotazione = Prenotazione.query.get(prenotazione_id)

        if not prenotazione:
            return jsonify({'success': False, 'message': 'Prenotazione non trovata'}), 404

        if str(prenotazione.user_id) != str(user_id):
            return jsonify({'success': False, 'message': 'Non autorizzato a gestire questa prenotazione'}), 403

        info_veicolo = "Veicolo sconosciuto"
        veicolo = Veicolo.query.get(prenotazione.veicolo_id)
        if veicolo:
            info_veicolo = f"{veicolo.marca} {veicolo.modello} ({veicolo.targa})"

        descrizione_log = (
            f"L'utente ha confermato la presa visione del rifiuto. "
            f"Cancellazione automatica prenotazione ID {prenotazione_id}. "
            f"Dati precedenti: Veicolo {info_veicolo}, "
            f"Dal {prenotazione.data_inizio} Al {prenotazione.data_fine}"
        )

        nuovo_log = LogOperazione(
            user_id=user_id,
            azione='Cancellazione (Presa Visione Rifiuto)',
            descrizione=descrizione_log
        )
        db.session.add(nuovo_log)
        db.session.delete(prenotazione)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Prenotazione rimossa e operazione registrata'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Errore conferma_visione_rifiuto: {str(e)}")
        return jsonify({'success': False, 'message': 'Errore durante l\'operazione'}), 500

# ==========================
# AVVIO SERVER
# ==========================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)