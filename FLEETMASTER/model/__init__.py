from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .utente import Utente
from .ruolo import Ruolo
from .veicolo import Veicolo
from .prenotazione import Prenotazione
from .log_operazione import LogOperazione
from .report import Report
