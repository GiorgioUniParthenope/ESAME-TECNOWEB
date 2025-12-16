from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from model import db

class LogOperazione(db.Model):
    __tablename__ = 'log_operazioni'
    log_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('utenti.user_id'))
    azione = db.Column(db.String(50), nullable=False)
    descrizione = db.Column(db.Text)
