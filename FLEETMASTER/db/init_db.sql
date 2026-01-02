-- public.ruoli definition

-- Drop table

-- DROP TABLE public.ruoli;

CREATE TABLE public.ruoli (
	ruolo_id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome_ruolo varchar(50) NOT NULL,
	descrizione text NULL,
	CONSTRAINT ruoli_nome_ruolo_key UNIQUE (nome_ruolo),
	CONSTRAINT ruoli_pkey PRIMARY KEY (ruolo_id)
);

-- Permissions

ALTER TABLE public.ruoli OWNER TO postgres;
GRANT ALL ON TABLE public.ruoli TO postgres;


-- public.tipologia_veicolo definition

-- Drop table

-- DROP TABLE public.tipologia_veicolo;

CREATE TABLE public.tipologia_veicolo (
	id varchar(50) NOT NULL,
	nome varchar(100) NOT NULL,
	descrizione text NULL,
	priorita int4 NULL,
	CONSTRAINT tipologia_veicolo_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.tipologia_veicolo OWNER TO postgres;
GRANT ALL ON TABLE public.tipologia_veicolo TO postgres;


-- public.utenti definition

-- Drop table

-- DROP TABLE public.utenti;

CREATE TABLE public.utenti (
	user_id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(50) NOT NULL,
	cognome varchar(50) NOT NULL,
	email varchar(100) NOT NULL,
	password_hash varchar(255) NOT NULL,
	ruolo_id uuid NULL,
	data_creazione timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	stato_attivo bool DEFAULT true NULL,
	CONSTRAINT utenti_email_key UNIQUE (email),
	CONSTRAINT utenti_pkey PRIMARY KEY (user_id),
	CONSTRAINT utenti_ruolo_id_fkey FOREIGN KEY (ruolo_id) REFERENCES public.ruoli(ruolo_id)
);

-- Permissions

ALTER TABLE public.utenti OWNER TO postgres;
GRANT ALL ON TABLE public.utenti TO postgres;


-- public.veicoli definition

-- Drop table

-- DROP TABLE public.veicoli;

CREATE TABLE public.veicoli (
	veicolo_id uuid DEFAULT gen_random_uuid() NOT NULL,
	targa varchar(20) NOT NULL,
	modello varchar(50) NOT NULL,
	marca varchar(50) NOT NULL,
	anno_immatricolazione int4 NOT NULL,
	stato_disponibile bool DEFAULT true NULL,
	ultima_manutenzione date NULL,
	tipologia_id varchar(50) NULL,
	url_immagine text NULL,
	CONSTRAINT veicoli_pkey PRIMARY KEY (veicolo_id),
	CONSTRAINT veicoli_targa_key UNIQUE (targa),
	CONSTRAINT fk_tipologia_veicolo FOREIGN KEY (tipologia_id) REFERENCES public.tipologia_veicolo(id) ON DELETE SET NULL
);

-- Permissions

ALTER TABLE public.veicoli OWNER TO postgres;
GRANT ALL ON TABLE public.veicoli TO postgres;


-- public.log_operazioni definition

-- Drop table

-- DROP TABLE public.log_operazioni;

CREATE TABLE public.log_operazioni (
	log_id uuid DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	user_id uuid NULL,
	azione varchar(50) NOT NULL,
	descrizione text NULL,
	CONSTRAINT logoperazioni_pkey PRIMARY KEY (log_id),
	CONSTRAINT logoperazioni_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.utenti(user_id)
);

-- Permissions

ALTER TABLE public.log_operazioni OWNER TO postgres;
GRANT ALL ON TABLE public.log_operazioni TO postgres;


-- public.prenotazioni definition

-- Drop table

-- DROP TABLE public.prenotazioni;

CREATE TABLE public.prenotazioni (
	prenotazione_id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NULL,
	veicolo_id uuid NULL,
	data_inizio timestamp NOT NULL,
	data_fine timestamp NOT NULL,
	stato varchar(20) NOT NULL,
	note text NULL,
	CONSTRAINT prenotazioni_pkey PRIMARY KEY (prenotazione_id),
	CONSTRAINT prenotazioni_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.utenti(user_id) ON DELETE CASCADE,
	CONSTRAINT prenotazioni_veicolo_id_fkey FOREIGN KEY (veicolo_id) REFERENCES public.veicoli(veicolo_id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.prenotazioni OWNER TO postgres;
GRANT ALL ON TABLE public.prenotazioni TO postgres;


-- public.reportistica definition

-- Drop table

-- DROP TABLE public.reportistica;

CREATE TABLE public.reportistica (
	report_id uuid DEFAULT gen_random_uuid() NOT NULL,
	data_generazione timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	tipo_report varchar(50) NOT NULL,
	contenuto jsonb NOT NULL,
	generato_da uuid NULL,
	CONSTRAINT reportistica_pkey PRIMARY KEY (report_id),
	CONSTRAINT reportistica_generato_da_fkey FOREIGN KEY (generato_da) REFERENCES public.utenti(user_id)
);

-- Permissions

ALTER TABLE public.reportistica OWNER TO postgres;
GRANT ALL ON TABLE public.reportistica TO postgres;