from functools import wraps
from flask import session, redirect, url_for, request, jsonify

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            # Se la richiesta vuole JSON (è una API), rispondi con errore 401
            if request.is_json or request.path.startswith('/get') or request.path.startswith('/prenota'):
                return jsonify({"success": False, "message": "Non autorizzato. Effettua il login."}), 401
            
            # Altrimenti, se è un browser, fai il redirect
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function