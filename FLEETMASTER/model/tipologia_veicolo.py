from model import db

class TipologiaVeicolo(db.Model):
    __tablename__ = 'tipologia_veicolo'

    id = db.Column(db.String(50), primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descrizione = db.Column(db.Text)

    veicoli = db.relationship("Veicolo", backref="tipologia", lazy=True)

    def __init__(self, id, nome, descrizione=None):
        self.id = id
        self.nome = nome
        self.descrizione = descrizione
