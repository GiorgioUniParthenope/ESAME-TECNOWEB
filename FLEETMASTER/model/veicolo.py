from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID
from model import db

class Veicolo(db.Model):
    __tablename__ = 'veicoli'
    veicolo_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    targa = db.Column(db.String(20), unique=True, nullable=False)
    modello = db.Column(db.String(50), nullable=False)
    marca = db.Column(db.String(50), nullable=False)
    anno_immatricolazione = db.Column(db.Integer, nullable=False)
    stato_disponibile = db.Column(db.Boolean, default=True)
    ultima_manutenzione = db.Column(db.Date)

    tipologia_id = db.Column(db.String(50), db.ForeignKey('tipologia_veicolo.id'), nullable=True)
    url_immagine = db.Column(db.Text, nullable=False)
    prenotazioni = db.relationship("Prenotazione", backref="veicolo", lazy=True, cascade="all, delete")
