from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID
from model import db

class Prenotazione(db.Model):
    __tablename__ = 'prenotazioni'
    prenotazione_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('utenti.user_id', ondelete="CASCADE"))
    veicolo_id = db.Column(UUID(as_uuid=True), db.ForeignKey('veicoli.veicolo_id', ondelete="CASCADE"))
    data_inizio = db.Column(db.DateTime, nullable=False)
    data_fine = db.Column(db.DateTime, nullable=False)
    stato = db.Column(db.String(20), nullable=False)
    note = db.Column(db.Text)
