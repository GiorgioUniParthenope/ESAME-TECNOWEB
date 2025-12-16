from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from model import db, Utente, TipologiaVeicolo , Veicolo, Prenotazione, LogOperazione, Utente
from route.login_required import login_required
from datetime import datetime
from werkzeug.security import check_password_hash

app = Flask(__name__)

app.secret_key = "chiave_super_segreta"

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:JwCsDhwQADBtHgMYmzCbPRbgIBwDnvxq@tramway.proxy.rlwy.net:20962/railway'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# ==========================
# HOME PAGE
# ==========================
@app.route('/')
@login_required
def index():
    if "user" in session:
        return render_template('index.html', user=session['user'])
    return redirect(url_for('login_page'))


# ==========================
# PAGINA LOGIN (GET)
# ==========================
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')



# ==========================
# PRENOTAZIONE PAGE
# ==========================
@app.route('/prenotazione', methods=['GET'])
@login_required
def prenotazione_page():
    if "user" in session:
        return render_template('prenotazione.html', user=session['user'])
    return redirect(url_for('login_page'))


# ==========================
# LOGIN API (POST JSON)
# ==========================
@app.route('/login', methods=['POST'])
def login_post():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Cerca nel DB per nome
    utente = Utente.query.filter_by(nome=username).first()

    if utente and check_password_hash(utente.password_hash, password):
        session['user'] = utente.to_dict()
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Credenziali errate"}), 401

# ==========================
# GET VEICOLI
# ==========================
@app.route('/getAllVeicoli', methods=['GET'])

def get_veicoli_disponibili():
    try:
        veicoli = Veicolo.query.filter_by(stato_disponibile=True).all()

        if not veicoli:
            return jsonify({"success": True, "veicoli": [], "message": "Nessun veicolo disponibile"}), 200

        veicoli_lista = []
        for v in veicoli:
            veicoli_lista.append({
                "veicolo_id": str(v.veicolo_id),
                "targa": v.targa,
                "modello": v.modello,
                "marca": v.marca,
                "anno_immatricolazione": v.anno_immatricolazione,
                "stato_disponibile": v.stato_disponibile,
                "tipologia": v.tipologia_id,
                "ultima_manutenzione": v.ultima_manutenzione.isoformat() if v.ultima_manutenzione else None
            })

        return jsonify({"success": True, "veicoli": veicoli_lista}), 200

    except Exception as e:
        # Log dell'errore lato server
        print("Errore durante il recupero dei veicoli disponibili:", str(e))
        return jsonify({"success": False, "message": "Errore interno del server"}), 500
    
    
# ==========================
# PRENOTAZIONE
# ==========================   

@app.route('/prenotaVeicolo', methods=['POST'])
def prenota_veicolo():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        veicolo_id = data.get('veicolo_id')
        data_inizio = data.get('data_inizio')
        data_fine = data.get('data_fine')
        note = data.get('note', '')

        # Controllo dati mancanti
        if not all([user_id, veicolo_id, data_inizio, data_fine]):
            return jsonify({"success": False, "message": "Dati mancanti"}), 400

        # Controllo veicolo disponibile
        veicolo = Veicolo.query.get(veicolo_id)
        if not veicolo:
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404
        if not veicolo.stato_disponibile:
            return jsonify({"success": False, "message": "Veicolo non disponibile"}), 400

        # Creazione prenotazione
        prenotazione = Prenotazione(
            user_id=user_id,
            veicolo_id=veicolo_id,
            data_inizio=datetime.fromisoformat(data_inizio),
            data_fine=datetime.fromisoformat(data_fine),
            stato='prenotata',
            note=note
        )
        db.session.add(prenotazione)

        # Aggiorna lo stato del veicolo
        veicolo.stato_disponibile = False

        # Log dell'operazione
        log = LogOperazione(
            user_id=user_id,
            azione='Prenotazione veicolo',
            descrizione=f'Veicolo {veicolo.marca} {veicolo.modello} ({veicolo.targa}) prenotato da utente {user_id}'
        )
        db.session.add(log)

        db.session.commit()

        return jsonify({"success": True, "message": "Veicolo prenotato correttamente"}), 200

    except Exception as e:
        db.session.rollback()
        print("Errore prenotazione:", e)
        return jsonify({"success": False, "message": "Errore interno del server"}), 500

# ==========================
# LOGOUT
# ==========================
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login_page'))


# ==========================
# AVVIO SERVER
# ==========================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # crea le tabelle se non esistono
    app.run(debug=True)
    
    
    
    
# ==========================
# API: GET VEICOLO BY ID
# ==========================
@app.route('/veicolo/<veicolo_id>', methods=['GET'])
@login_required
def get_veicolo_by_id(veicolo_id):
    try:
        # Cerca il veicolo tramite ID
        veicolo = Veicolo.query.get(veicolo_id)

        if not veicolo:
            return jsonify({"success": False, "message": "Veicolo non trovato"}), 404

        # Costruiamo il dizionario dati
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
# API: ULTIMA PRENOTAZIONE UTENTE (Senza parametri)
# ==========================
@app.route('/getLastPrenotazione', methods=['GET'])
@login_required
def get_ultima_prenotazione():
    try:
        user_id = session['user']['user_id']

        
        result = db.session.query(Prenotazione, Veicolo)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.user_id == user_id)\
            .order_by(Prenotazione.data_inizio.desc())\
            .first()

        
        if not result:
            return jsonify({"success": False, "message": "Nessuna prenotazione trovata"}), 404

        prenotazione, veicolo = result

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
                # Se vuoi aggiungere l'immagine:
                # "immagine": "/static/img/..." 
            }
        }

        return jsonify({"success": True, "prenotazione": data}), 200

    except Exception as e:
        print(f"Errore recupero ultima prenotazione: {e}")
        return jsonify({"success": False, "message": "Errore server"}), 500
    
# ==========================
# API: RESTITUISCI VEICOLO (Check-in anticipato)
# ==========================
@app.route('/restituisciVeicolo', methods=['POST'])
@login_required
def restituisci_veicolo():
    try:
        data = request.get_json()
        prenotazione_id = data.get('prenotazione_id')

        # 1. Cerca la prenotazione
        prenotazione = Prenotazione.query.get(prenotazione_id)
        
        if not prenotazione:
            return jsonify({"success": False, "message": "Prenotazione non trovata"}), 404
            
        # Controllo che sia dell'utente loggato
        if str(prenotazione.user_id) != str(session['user']['user_id']):
             return jsonify({"success": False, "message": "Non autorizzato"}), 403

        if prenotazione.stato != 'prenotata':
            return jsonify({"success": False, "message": "Prenotazione già conclusa"}), 400

        # 2. Aggiorna stato prenotazione
        prenotazione.stato = 'conclusa'
        prenotazione.data_fine = datetime.now() # Imposta l'orario reale di fine

        # 3. Libera il veicolo
        veicolo = Veicolo.query.get(prenotazione.veicolo_id)
        if veicolo:
            veicolo.stato_disponibile = True

        db.session.commit()

        return jsonify({"success": True, "message": "Veicolo restituito con successo"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Errore restituzione: {e}")
        return jsonify({"success": False, "message": "Errore del server"}), 500