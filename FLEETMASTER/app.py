from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from model import db, Utente, TipologiaVeicolo, Veicolo, Prenotazione, LogOperazione, Ruolo
from route.login_required import login_required
from datetime import datetime
from werkzeug.security import check_password_hash
import uuid

app = Flask(__name__)

# Configurazione Base
app.secret_key = "chiave_super_segreta"
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:JwCsDhwQADBtHgMYmzCbPRbgIBwDnvxq@tramway.proxy.rlwy.net:20962/railway'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# ==========================================
# UTILITY HELPER
# ==========================================

def get_admin_role_id():
    """
    Recupera l'ID del ruolo 'admin' dal DB.
    Utile per confronti dinamici senza hardcodare ID numerici.
    """
    try:
        ruolo_admin = Ruolo.query.filter_by(nome_ruolo='admin').first()
        return str(ruolo_admin.ruolo_id) if ruolo_admin else None
    except Exception as e:
        print(f"Errore recupero ruolo Admin: {e}")
        return None

def get_role_name_by_id(role_id):
    """Restituisce il nome leggibile del ruolo dato l'ID."""
    try:
        ruolo = Ruolo.query.get(role_id)
        return ruolo.nome_ruolo if ruolo else None
    except:
        return None

# ==========================================
# FRONTEND ROUTING
# ==========================================

@app.route('/')
def index():
    if "user" not in session:
        return redirect(url_for('login_page'))
    
    # Routing condizionale: Admin -> Backoffice, Altri -> Home Noleggio
    admin_id = get_admin_role_id()
    if str(session['user'].get('ruolo_id')) == str(admin_id):
        return render_template('backoffice.html', user=session['user'])
    
    return render_template('index.html', user=session['user'])

@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/prenotazione', methods=['GET'])
@login_required
def prenotazione_page():
    return render_template('prenotazione.html', user=session['user'])

# ==========================================
# AUTHENTICATION API
# ==========================================

@app.route('/login', methods=['POST'])
def login_post():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    utente = Utente.query.filter_by(email=email).first()

    if utente and check_password_hash(utente.password_hash, password):
        # Serializzazione utente in sessione
        session['user'] = utente.to_dict()
        return jsonify({"success": True})
    
    return jsonify({"success": False, "message": "Credenziali errate"}), 401

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login_page'))

# ==========================================
# API USER: BUSINESS LOGIC
# ==========================================

@app.route('/getAllVeicoli', methods=['GET'])
@login_required 
def get_veicoli_disponibili():
    """
    Restituisce i veicoli disponibili filtrati per ruolo utente.
    - Impiegato: Solo Tipologia Priorità 1
    - Manager: Priorità 1 e 2
    - Admin: Tutto
    """
    try:
        user_role_id = session['user'].get('ruolo_id')
        role_name = get_role_name_by_id(user_role_id)
        
        # Query base: veicoli disponibili
        query = db.session.query(Veicolo).join(TipologiaVeicolo).filter(Veicolo.stato_disponibile == True)

        if role_name == 'admin':
            # Override: admin vede tutto, anche senza tipologia strict
            query = Veicolo.query.filter_by(stato_disponibile=True)
        elif role_name == 'impiegato':
            query = query.filter(TipologiaVeicolo.priorita == 1)
        elif role_name == 'manager':
            query = query.filter(TipologiaVeicolo.priorita.in_([1, 2]))
        else:
            # Default fallback
            query = query.filter(TipologiaVeicolo.priorita == 1)

        veicoli = query.all()
        
        veicoli_lista = []
        for v in veicoli:
            # Fetch dati tipologia safe (se join non presente o oggetto staccato)
            nome_tipo = "N/D"
            priorita_tipo = 0
            if v.tipologia_id:
                t = TipologiaVeicolo.query.get(v.tipologia_id)
                if t:
                    nome_tipo = t.nome
                    priorita_tipo = t.priorita

            veicoli_lista.append({
                "veicolo_id": str(v.veicolo_id),
                "targa": v.targa,
                "modello": v.modello,
                "marca": v.marca,
                "anno_immatricolazione": v.anno_immatricolazione,
                "stato_disponibile": v.stato_disponibile,
                "tipologia": nome_tipo,
                "priorita": priorita_tipo,
                "img": v.url_immagine,
                "ultima_manutenzione": v.ultima_manutenzione.isoformat() if v.ultima_manutenzione else None
            })
            
        return jsonify({"success": True, "veicoli": veicoli_lista}), 200
        
    except Exception as e:
        print(f"Errore get_veicoli_disponibili: {e}")
        return jsonify({"success": False, "message": "Errore interno server"}), 500

@app.route('/prenotaVeicolo', methods=['POST'])
@login_required
def prenota_veicolo():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        veicolo_id = data.get('veicolo_id')
        
        if not all([user_id, veicolo_id, data.get('data_inizio'), data.get('data_fine')]):
            return jsonify({"success": False, "message": "Dati mancanti"}), 400

        # Policy: Un utente può avere una sola richiesta attiva alla volta.
        # Puliamo lo storico precedente (o le richieste vecchie).
        Prenotazione.query.filter_by(user_id=user_id).delete()

        # LOCK OPTIMISTIC/PESSIMISTIC: with_for_update() evita race conditions
        veicolo = Veicolo.query.filter_by(veicolo_id=veicolo_id).with_for_update().first()

        if not veicolo or not veicolo.stato_disponibile:
            db.session.rollback()
            return jsonify({"success": False, "message": "Veicolo non disponibile o inesistente"}), 400

        # Creazione record prenotazione
        prenotazione = Prenotazione(
            user_id=user_id,
            veicolo_id=veicolo_id,
            data_inizio=datetime.fromisoformat(data.get('data_inizio')),
            data_fine=datetime.fromisoformat(data.get('data_fine')),
            stato='in attesa',
            note=data.get('note', '')
        )
        db.session.add(prenotazione)

        # Log audit
        log = LogOperazione(
            user_id=user_id,
            azione='Richiesta Prenotazione',
            descrizione=f"Richiesta per {veicolo.marca} {veicolo.modello} ({veicolo.targa})"
        )
        db.session.add(log)

        db.session.commit()
        return jsonify({"success": True, "message": "Richiesta inviata"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Exception prenotazione: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/getLastPrenotazione', methods=['GET'])
@login_required
def get_ultima_prenotazione():
    try:
        user_id = session['user']['user_id']
        stati_attivi = ['in attesa', 'approvata', 'prenotata', 'rifiutata']

        # Recupera l'ultima prenotazione in uno stato rilevante per l'utente
        res = db.session.query(Prenotazione, Veicolo)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.user_id == user_id)\
            .filter(Prenotazione.stato.in_(stati_attivi))\
            .order_by(Prenotazione.data_inizio.desc())\
            .first()

        if not res:
            return jsonify({"success": False, "message": "Nessuna prenotazione attiva"}), 200

        prenotazione, veicolo = res
        
        # Build response payload
        payload = {
            "prenotazione_id": str(prenotazione.prenotazione_id),
            "data_inizio": prenotazione.data_inizio.isoformat(),
            "data_fine": prenotazione.data_fine.isoformat(),
            "stato": prenotazione.stato,
            "note": prenotazione.note,
            "veicolo": {
                "marca": veicolo.marca,
                "modello": veicolo.modello,
                "targa": veicolo.targa,
                "img": getattr(veicolo, 'immagine', None) or getattr(veicolo, 'url_immagine', None)
            }
        }
        return jsonify({"success": True, "prenotazione": payload}), 200

    except Exception as e:
        return jsonify({"success": False, "message": "Errore server"}), 500

@app.route('/restituisciVeicolo', methods=['POST'])
@login_required
def restituisci_veicolo():
    try:
        data = request.get_json()
        prenotazione = Prenotazione.query.get(data.get('prenotazione_id'))
        
        # Security Check
        if not prenotazione:
            return jsonify({"success": False, "message": "Non trovato"}), 404
        if str(prenotazione.user_id) != str(session['user']['user_id']):
             return jsonify({"success": False, "message": "Non autorizzato"}), 403

        # State transition
        prenotazione.stato = 'conclusa'
        prenotazione.data_fine = datetime.now()

        veicolo = Veicolo.query.get(prenotazione.veicolo_id)
        if veicolo:
            veicolo.stato_disponibile = True

        db.session.commit()
        return jsonify({"success": True, "message": "Restituzione completata"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/confermaVisioneRifiuto', methods=['POST'])
@login_required
def conferma_visione_rifiuto():
    """
    Gestisce l'ACK dell'utente su una prenotazione rifiutata.
    La prenotazione viene cancellata fisicamente dopo il log.
    """
    try:
        p_id = request.get_json().get('prenotazione_id')
        user_id = session['user']['user_id']
        prenotazione = Prenotazione.query.get(p_id)

        if not prenotazione or str(prenotazione.user_id) != str(user_id):
            return jsonify({'success': False, 'message': 'Errore validazione richiesta'}), 403

        # Info per il log prima della cancellazione
        v = Veicolo.query.get(prenotazione.veicolo_id)
        info_v = f"{v.marca} {v.modello}" if v else "Veicolo rimosso"
        
        log = LogOperazione(
            user_id=user_id,
            azione='Cancellazione (ACK Rifiuto)',
            descrizione=f"Utente ha visto rifiuto per {info_v}. Prenotazione rimossa."
        )
        db.session.add(log)
        db.session.delete(prenotazione)
        db.session.commit()

        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==========================================
# API ADMIN (BACKOFFICE)
# ==========================================

@app.route('/getAllVeicoliAdmin', methods=['GET'])
@login_required
def get_all_veicoli_admin():
    if str(session['user'].get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False, "message": "Forbidden"}), 403
    
    try:
        veicoli = Veicolo.query.all()
        lista = []
        for v in veicoli:
            # Helper per dati tipologia
            t_nome, t_priorita = "N/D", "N/D"
            if v.tipologia_id:
                tipo = TipologiaVeicolo.query.get(v.tipologia_id)
                if tipo:
                    t_nome, t_priorita = tipo.nome, tipo.priorita

            lista.append({
                "veicolo_id": str(v.veicolo_id),
                "targa": v.targa,
                "modello": v.modello,
                "marca": v.marca,
                "tipologia": t_nome,
                "priorita": t_priorita,
                "immagine": getattr(v, 'immagine', getattr(v, 'url_immagine', None)),
                "stato_disponibile": v.stato_disponibile
            })
        return jsonify({"success": True, "veicoli": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/getAllPrenotazioniInAttesa', methods=['GET'])
@login_required
def get_all_prenotazioni_in_attesa():
    if str(session['user'].get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False}), 403
        
    try:
        # Join esplicita per recuperare dati utente e veicolo in un colpo solo
        res = db.session.query(Prenotazione, Utente, Veicolo)\
            .join(Utente, Prenotazione.user_id == Utente.user_id)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.stato == 'in attesa').all()

        lista = [{
            "id": p.prenotazione_id,
            "user_id": str(u.user_id),
            "username": u.nome,
            "marca": v.marca,
            "modello": v.modello,
            "targa": v.targa,
            "data_inizio": p.data_inizio.isoformat(),
            "created_at": p.data_inizio.isoformat(), # Usato come data richiesta
            "note": p.note
        } for p, u, v in res]
        
        return jsonify({"success": True, "prenotazioni": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- ADMIN CRUD & WORKFLOW ---

@app.route('/aggiungiVeicolo', methods=['POST'])
@login_required
def aggiungi_veicolo():
    return gestione_veicolo_admin(request, 'add')

@app.route('/modificaVeicolo', methods=['POST'])
@login_required
def modifica_veicolo():
    return gestione_veicolo_admin(request, 'edit')

@app.route('/eliminaVeicolo', methods=['POST'])
@login_required
def elimina_veicolo():
    if str(session['user'].get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False}), 403
    
    try:
        v_id = request.get_json().get('veicolo_id')
        veicolo = Veicolo.query.get(v_id)
        if veicolo:
            db.session.delete(veicolo)
            db.session.commit()
            return jsonify({"success": True}), 200
        return jsonify({"success": False, "message": "Not Found"}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/approvaPrenotazione', methods=['POST'])
@login_required
def approva_prenotazione():
    return workflow_prenotazione(request, 'approvata')

@app.route('/rifiutaPrenotazione', methods=['POST'])
@login_required
def rifiuta_prenotazione():
    return workflow_prenotazione(request, 'rifiutata')

# ==========================================
# INTERNAL HANDLERS (ADMIN HELPERS)
# ==========================================

def gestione_veicolo_admin(req, action):
    """Gestisce logica comune Add/Edit veicolo"""
    if str(session['user'].get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False, "message": "Forbidden"}), 403

    data = req.get_json()
    try:
        # Risoluzione Tipologia
        tipologia_id = None
        if data.get('tipologia'):
            t = TipologiaVeicolo.query.filter_by(nome=data.get('tipologia')).first()
            if not t: return jsonify({'success': False, 'message': 'Tipologia inesistente'}), 400
            tipologia_id = t.id

        if action == 'add':
            v = Veicolo(
                marca=data.get('marca'),
                modello=data.get('modello'),
                targa=data.get('targa'),
                tipologia_id=tipologia_id,
                stato_disponibile=True,
                anno_immatricolazione=datetime.now().year,
                ultima_manutenzione=datetime.now(),
                url_immagine=data.get('immagine')
            )
            # Compatibilità nome campo
            if hasattr(v, 'immagine'): v.immagine = data.get('immagine')
            db.session.add(v)

        elif action == 'edit':
            v = Veicolo.query.get(data.get('veicolo_id'))
            if not v: return jsonify({"success": False, "message": "Veicolo non trovato"}), 404
            
            v.marca = data.get('marca')
            v.modello = data.get('modello')
            v.targa = data.get('targa')
            if tipologia_id: v.tipologia_id = tipologia_id
            
            if hasattr(v, 'immagine'): v.immagine = data.get('immagine')
            elif hasattr(v, 'url_immagine'): v.url_immagine = data.get('immagine')

        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

def workflow_prenotazione(req, nuovo_stato):
    """Gestisce approvazione/rifiuto prenotazioni"""
    if str(session['user'].get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False}), 403
    
    try:
        p = Prenotazione.query.get(req.get_json().get('prenotazione_id'))
        if not p: return jsonify({"success": False, "message": "Prenotazione non trovata"}), 404

        p.stato = nuovo_stato
        
        # Se approvata, blocca veicolo
        if nuovo_stato == 'approvata':
            v = Veicolo.query.get(p.veicolo_id)
            if v: v.stato_disponibile = False
        
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================================
# PUBLIC UTILS
# ==========================================

@app.route('/veicolo/<veicolo_id>', methods=['GET'])
@login_required
def get_veicolo_by_id(veicolo_id):
    try:
        v = Veicolo.query.get(veicolo_id)
        if not v: return jsonify({"success": False}), 404

        return jsonify({
            "success": True, 
            "veicolo": {
                "veicolo_id": str(v.veicolo_id),
                "marca": v.marca,
                "modello": v.modello,
                "targa": v.targa,
                "anno": v.anno_immatricolazione,
                "ultima_manutenzione": v.ultima_manutenzione.isoformat() if v.ultima_manutenzione else "",
                "tipologia": v.tipologia_id or "N/D"
            }
        }), 200
    except:
        return jsonify({"success": False}), 500

@app.route('/getAllTipologie', methods=['GET'])
def get_all_tipologie():
    try:
        t = TipologiaVeicolo.query.all()
        return jsonify({"success": True, "tipologie": [{"id": str(x.id), "nome": x.nome} for x in t]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)