from flask_sqlalchemy import SQLAlchemy
import uuid
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from model import db

class Report(db.Model):
    __tablename__ = 'reportistica'
    report_id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_generazione = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    tipo_report = db.Column(db.String(50), nullable=False)
    contenuto = db.Column(JSONB, nullable=False)
    generato_da = db.Column(UUID(as_uuid=True), db.ForeignKey('utenti.user_id'))
