from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID
from model import db

class Ruolo(db.Model):
    __tablename__ = 'ruoli'
    ruolo_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_ruolo = db.Column(db.String(50), unique=True, nullable=False)
    descrizione = db.Column(db.Text)

    utenti = db.relationship("Utente", backref="ruolo", lazy=True)
