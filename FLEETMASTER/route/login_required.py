from functools import wraps
from flask import session, redirect, url_for, request, jsonify

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            # If the request wants JSON (it's an API), it responds with error 401
            if request.is_json or request.path.startswith('/get') or request.path.startswith('/prenota'):
                return jsonify({"success": False, "message": "Non autorizzato. Effettua il login."}), 401
            
            # Otherwise, if it's a browser, redirect
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function