from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from model import db

class Utente(db.Model):
    __tablename__ = 'utenti'
    user_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = db.Column(db.String(50), nullable=False)
    cognome = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    ruolo_id = db.Column(UUID(as_uuid=True), db.ForeignKey('ruoli.ruolo_id'))
    data_creazione = db.Column(db.DateTime, default=datetime.utcnow)
    stato_attivo = db.Column(db.Boolean, default=True)

    log_operazioni = db.relationship("LogOperazione", backref="utente", lazy=True)
    prenotazioni = db.relationship("Prenotazione", backref="utente", lazy=True, cascade="all, delete")
    
    def to_dict(self):
        return {
            "user_id": str(self.user_id),
            "nome": self.nome,
            "cognome": self.cognome,
            "email": self.email,
            "ruolo_id": str(self.ruolo_id) if self.ruolo_id else None,
            "data_creazione": self.data_creazione.isoformat() if self.data_creazione else None,
            "stato_attivo": self.stato_attivo
        }
