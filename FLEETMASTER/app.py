from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from model import db, Utente, Veicolo
from route import login_required 
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
        return render_template('index.html', username=session['user'])
    return redirect(url_for('login_page'))


# ==========================
# PAGINA LOGIN (GET)
# ==========================
@app.route('/login', methods=['GET'])
@login_required
def login_page():
    return render_template('login.html')


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
        session['user'] = utente
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Credenziali errate"}), 401

# ==========================
# GET VEICOLI
# ==========================
@app.route('/getAllVeicoli', methods=['GET'])
@login_required
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
                "ultima_manutenzione": v.ultima_manutenzione.isoformat() if v.ultima_manutenzione else None
            })

        return jsonify({"success": True, "veicoli": veicoli_lista}), 200

    except Exception as e:
        # Log dell'errore lato server
        print("Errore durante il recupero dei veicoli disponibili:", str(e))
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
