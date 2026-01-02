import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from model import db, Utente, TipologiaVeicolo, Veicolo, Prenotazione, LogOperazione, Ruolo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
import uuid

# --- LOAD ENV VARS ---
load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION ---
# FIX: Load sensitive data from environment variables
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- JWT SETUP ---
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY', 'fallback_secret_dev_only')
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"

db.init_app(app)
jwt = JWTManager(app)

# ==========================================
# UTILS
# ==========================================

def get_admin_role_id():
    # Safely retrieve admin ID for permission checks
    try:
        ruolo_admin = Ruolo.query.filter_by(nome_ruolo='admin').first()
        return str(ruolo_admin.ruolo_id) if ruolo_admin else None
    except Exception as e:
        print(f"Err retrieving admin: {e}")
        return None

def get_role_name_by_id(role_id):
    # Quick helper: ID -> Name
    try:
        ruolo = Ruolo.query.get(role_id)
        return ruolo.nome_ruolo if ruolo else None
    except:
        return None

# ==========================================
# VIEWS (Jinja2)
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/backoffice')
def backoffice_view():
    return render_template('backoffice.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/prenotazione')
def prenotazione_page():
    return render_template('prenotazione.html')

# ==========================================
# API AUTH
# ==========================================

@app.route('/login', methods=['POST'])
def login_post():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    utente = Utente.query.filter_by(email=email).first()

    if utente and check_password_hash(utente.password_hash, password):
        
        # NOTE: Explicit role string required for frontend UI
        ruolo = Ruolo.query.get(utente.ruolo_id)
        nome_ruolo = ruolo.nome_ruolo if ruolo else "unknown"

        user_claims = {
            "user_id": str(utente.user_id),
            "ruolo_id": str(utente.ruolo_id),
            "ruolo_nome": nome_ruolo, 
            "nome": utente.nome,
            "email": utente.email
        }
        
        # Inject claims into token to avoid extra queries later
        token = create_access_token(identity=str(utente.user_id), additional_claims=user_claims)
        
        return jsonify({
            "success": True, 
            "token": token, 
            "user": user_claims
        })
    
    return jsonify({"success": False, "message": "Credenziali errate"}), 401

# ==========================================
# API USER FLOW
# ==========================================

@app.route('/getAllVeicoli', methods=['GET'])
@jwt_required() 
def get_veicoli_disponibili():
    try:
        # FIX: get_jwt() returns full dict, identity is just a string
        claims = get_jwt()
        user_role_id = claims.get('ruolo_id')
        role_name = get_role_name_by_id(user_role_id)
        
        query = db.session.query(Veicolo).join(TipologiaVeicolo).filter(Veicolo.stato_disponibile == True)

        # Role filtering logic (Hardcoded rules)
        if role_name == 'admin':
            query = Veicolo.query.filter_by(stato_disponibile=True)
        elif role_name == 'impiegato':
            query = query.filter(TipologiaVeicolo.priorita == 1)
        elif role_name == 'manager':
            query = query.filter(TipologiaVeicolo.priorita.in_([1, 2]))
        else:
            query = query.filter(TipologiaVeicolo.priorita == 1) # Safe fallback

        veicoli = query.all()
        
        # TODO: Move serialization to model .to_dict() method
        veicoli_lista = []
        for v in veicoli:
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
        print(f"Err get_veicoli: {e}")
        return jsonify({"success": False, "message": "Errore interno server"}), 500

@app.route('/prenotaVeicolo', methods=['POST'])
@jwt_required()
def prenota_veicolo():
    try:
        user_id = get_jwt_identity() 
        data = request.get_json()
        veicolo_id = data.get('veicolo_id')
        
        if not all([veicolo_id, data.get('data_inizio'), data.get('data_fine')]):
            return jsonify({"success": False, "message": "Dati mancanti"}), 400

        # Policy: 1 active reservation per user. Clear old pending ones.
        Prenotazione.query.filter_by(user_id=user_id).delete()

        # DB row lock to prevent race conditions
        veicolo = Veicolo.query.filter_by(veicolo_id=veicolo_id).with_for_update().first()

        if not veicolo or not veicolo.stato_disponibile:
            db.session.rollback()
            return jsonify({"success": False, "message": "Veicolo non disponibile"}), 400

        prenotazione = Prenotazione(
            user_id=user_id,
            veicolo_id=veicolo_id,
            data_inizio=datetime.fromisoformat(data.get('data_inizio')),
            data_fine=datetime.fromisoformat(data.get('data_fine')),
            stato='in attesa',
            note=data.get('note', '')
        )
        db.session.add(prenotazione)

        # Audit log
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
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/getLastPrenotazione', methods=['GET'])
@jwt_required()
def get_ultima_prenotazione():
    try:
        user_id = get_jwt_identity()
        stati_attivi = ['in attesa', 'approvata', 'prenotata', 'rifiutata']

        # Join to retrieve vehicle data in a single shot
        res = db.session.query(Prenotazione, Veicolo)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.user_id == user_id)\
            .filter(Prenotazione.stato.in_(stati_attivi))\
            .order_by(Prenotazione.data_inizio.desc())\
            .first()

        if not res:
            return jsonify({"success": False, "message": "Nessuna prenotazione attiva"}), 200

        prenotazione, veicolo = res
        
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
        print(e)
        return jsonify({"success": False, "message": "Errore server"}), 500

@app.route('/restituisciVeicolo', methods=['POST'])
@jwt_required()
def restituisci_veicolo():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        prenotazione = Prenotazione.query.get(data.get('prenotazione_id'))
        
        if not prenotazione:
            return jsonify({"success": False, "message": "Non trovato"}), 404
        
        # Security check: owner
        if str(prenotazione.user_id) != str(user_id):
             return jsonify({"success": False, "message": "Non autorizzato"}), 403

        prenotazione.stato = 'conclusa'
        prenotazione.data_fine = datetime.now()

        # Immediately free up vehicle
        veicolo = Veicolo.query.get(prenotazione.veicolo_id)
        if veicolo:
            veicolo.stato_disponibile = True

        db.session.commit()
        return jsonify({"success": True, "message": "Restituzione completata"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/confermaVisioneRifiuto', methods=['POST'])
@jwt_required()
def conferma_visione_rifiuto():
    try:
        user_id = get_jwt_identity()
        p_id = request.get_json().get('prenotazione_id')
        prenotazione = Prenotazione.query.get(p_id)

        if not prenotazione or str(prenotazione.user_id) != str(user_id):
            return jsonify({'success': False, 'message': 'Errore validazione richiesta'}), 403

        # Log and delete (User ACK)
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
@jwt_required()
def get_all_veicoli_admin():
    claims = get_jwt()
    # Strict role check
    if str(claims.get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False, "message": "Forbidden"}), 403
    
    try:
        veicoli = Veicolo.query.all()
        lista = []
        for v in veicoli:
            # Retrieve type if present
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
                "ultima_manutenzione": v.ultima_manutenzione,
                "immagine": getattr(v, 'immagine', getattr(v, 'url_immagine', None)),
                "stato_disponibile": v.stato_disponibile
            })
        return jsonify({"success": True, "veicoli": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/getAllPrenotazioniInAttesa', methods=['GET'])
@jwt_required()
def get_all_prenotazioni_in_attesa():
    claims = get_jwt()
    if str(claims.get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False}), 403
        
    try:
        # 3-way join for full dashboard detail
        res = db.session.query(Prenotazione, Utente, Veicolo)\
            .join(Utente, Prenotazione.user_id == Utente.user_id)\
            .join(Veicolo, Prenotazione.veicolo_id == Veicolo.veicolo_id)\
            .filter(Prenotazione.stato == 'in attesa').all()

        lista = [{
            "id": p.prenotazione_id,
            "user_id": str(u.user_id),
            "email": u.email,
            "username": u.nome,
            "marca": v.marca,
            "modello": v.modello,
            "targa": v.targa,
            "data_inizio": p.data_inizio.isoformat(),
            "created_at": p.data_inizio.isoformat(),
            "note": p.note
        } for p, u, v in res]
        
        return jsonify({"success": True, "prenotazioni": lista}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- ADMIN CRUD & WORKFLOW ---

@app.route('/aggiungiVeicolo', methods=['POST'])
@jwt_required()
def aggiungi_veicolo():
    return gestione_veicolo_admin(request, 'add')

@app.route('/modificaVeicolo', methods=['POST'])
@jwt_required()
def modifica_veicolo():
    return gestione_veicolo_admin(request, 'edit')

@app.route('/eliminaVeicolo', methods=['POST'])
@jwt_required()
def elimina_veicolo():
    claims = get_jwt()
    if str(claims.get('ruolo_id')) != str(get_admin_role_id()):
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
@jwt_required()
def approva_prenotazione():
    return workflow_prenotazione(request, 'approvata')

@app.route('/rifiutaPrenotazione', methods=['POST'])
@jwt_required()
def rifiuta_prenotazione():
    return workflow_prenotazione(request, 'rifiutata')

# ==========================================
# ADMIN HELPERS
# ==========================================

def gestione_veicolo_admin(req, action):
    claims = get_jwt()
    if str(claims.get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False, "message": "Forbidden"}), 403

    data = req.get_json()
    try:
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
            # Image field compatibility
            if hasattr(v, 'immagine'): v.immagine = data.get('immagine')
            db.session.add(v)

        elif action == 'edit':
            v = Veicolo.query.get(data.get('veicolo_id'))
            if not v: return jsonify({"success": False, "message": "Veicolo non trovato"}), 404
            
            v.marca = data.get('marca')
            v.modello = data.get('modello')
            v.targa = data.get('targa')
            v.ultima_manutenzione = data.get('ultima_manutenzione')
            if tipologia_id: v.tipologia_id = tipologia_id
            
            if hasattr(v, 'immagine'): v.immagine = data.get('immagine')
            elif hasattr(v, 'url_immagine'): v.url_immagine = data.get('immagine')

        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

def workflow_prenotazione(req, nuovo_stato):
    # Centralized state change logic
    claims = get_jwt()
    if str(claims.get('ruolo_id')) != str(get_admin_role_id()):
        return jsonify({"success": False}), 403
    
    try:
        p = Prenotazione.query.get(req.get_json().get('prenotazione_id'))
        if not p: return jsonify({"success": False, "message": "Prenotazione non trovata"}), 404

        p.stato = nuovo_stato
        
        # If approved, lock vehicle
        if nuovo_stato == 'approvata':
            v = Veicolo.query.get(p.veicolo_id)
            if v: v.stato_disponibile = False
        
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==========================================
# PUBLIC
# ==========================================

@app.route('/veicolo/<veicolo_id>', methods=['GET'])
@jwt_required()
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
    # DEBUG: Host 0.0.0.0 is safe for Docker/Cloud, be careful in local dev without firewall
    app.run(debug=os.getenv('DEBUG', 'False') == 'True', host='0.0.0.0')