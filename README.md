# 🚗 FleetMaster

### Corporate Fleet Management System

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Docker-blue)
![Architecture](https://img.shields.io/badge/architecture-L.N.P.P.-purple)

**FleetMaster** is a digital platform designed to simplify and streamline **internal corporate fleet management**.

The system coordinates the activities of **Administrators**, **Managers**, and **Employees**, offering role-based functionalities.
It replaces manual and redundant processes with a **centralized digital workflow**, ensuring clear approval flows and optimized vehicle availability.

---

## 📋 Exam Requirements Compliance

This project has been engineered to **strictly follow** the TechWeb exam guidelines regarding architecture and environment.

* ✅ **NO Windows / NO XAMPP**
  The application is fully containerized using **Docker**. Regardless of the host OS, the runtime environment is **Linux (Debian/Alpine)**.

* ✅ **Production-grade architecture (L.N.P.P. Stack)**

  * **OS**: Linux (via Docker containers)
  * **Web Server**: Nginx (Reverse Proxy)
  * **App Server**: Gunicorn (WSGI)
  * **Language**: Python (Flask)
  * **Database**: PostgreSQL (Cloud instance via Railway)

---

## 🏗️ Architectural Decisions

This section highlights the **key architectural choices** adopted to ensure scalability, maintainability, and exam compliance.

### Docker-First Design

The entire system is containerized using Docker and Docker Compose to guarantee:

* A consistent **Linux runtime**
* Environment reproducibility
* Full compliance with exam constraints

### Reverse Proxy (Nginx)

Nginx acts as a reverse proxy in front of the Flask application:

* Separates HTTP handling from application logic
* Mirrors real-world production setups
* Prevents direct exposure of the app server

### Gunicorn (WSGI)

Gunicorn is used instead of Flask’s development server:

* Multi-worker support
* Better performance and stability
* Production-grade WSGI compliance

### Role-Based Access Control (RBAC)

System access is enforced through RBAC:

* Administrator
* Manager
* Employee

Permissions are validated both **server-side and UI-side** to prevent unauthorized actions.

### Stateless Application

The application is stateless:

* Persistent data stored in PostgreSQL
* Configuration via environment variables
* No dependency on local filesystem state

---

## 🛠️ Technology Stack

| Component        | Technology              | Description                           |
| ---------------- | ----------------------- | ------------------------------------- |
| Containerization | Docker & Docker Compose | Linux-based environment orchestration |
| Web Server       | Nginx                   | Reverse proxy and HTTP handling       |
| App Server       | Gunicorn                | Production WSGI server                |
| Backend          | Python / Flask          | Core application logic and APIs       |
| Database         | PostgreSQL              | SQLAlchemy ORM                        |
| Frontend         | Bootstrap 5 & jQuery    | Responsive UI/UX                      |

---

## 🚀 Installation & Setup

### 1. Prerequisites

* **Docker Desktop** installed and running
* Active internet connection (for remote PostgreSQL database)

---

### 2. Start the Environment

From the project root directory:

```bash
docker compose up --build
```

This command:

* Builds Linux-based Docker images
* Installs Python dependencies
* Starts **Nginx** and **Flask (Gunicorn)** containers

---

### 3. Access the Application

Once running, open your browser:

👉 **[http://localhost](http://localhost)**

The application is exposed on **port 80 via Nginx**.

---

## 🌍 Public Demo Mode (ngrok)

This option allows external access **without deploying to a cloud server** (ideal for exams or presentations).

1. Start the local Docker environment
2. Install **ngrok**
3. Run:

```bash
ngrok http 80
```

4. Share the generated HTTPS URL

⚠️ Do not close the ngrok terminal or the tunnel will stop.

---

## 🗄️ Database Configuration

FleetMaster relies on **PostgreSQL** for persistent storage.

### Default Cloud Database

* Pre-configured PostgreSQL instance hosted on **Railway**
* No local database installation required
* Ideal for demos and exam evaluation

### Custom Database (Optional)

Override the default database using environment variables.

Create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/fleetmaster
```

Docker Compose will automatically load it.

> If `DATABASE_URL` is defined, it **overrides the default cloud configuration**.

### Schema Initialization

* Implemented using **SQLAlchemy ORM**
* Tables are automatically created on first startup via:

```python
db.create_all()
```

No manual SQL scripts are required.

---

## 👥 User Roles & Use Cases

FleetMaster enforces **Role-Based Access Control (RBAC)**.

### 👑 Administrator (Admin)

**Access**: Backoffice Dashboard
**Capabilities**:

* Full CRUD on fleet vehicles
* Approve or reject booking requests
* Monitor real-time vehicle status

---

### 💼 Manager

**Privileges**:

* Book **Standard (Priority 1)** and **Premium/Executive (Priority 2)** vehicles

**Capabilities**:

* Request vehicles for date ranges
* View personal booking history

---

### 👤 Employee (Impiegato)

**Privileges**:

* Book **Standard vehicles only**
* Premium vehicles are hidden

**Capabilities**:

* Simple booking interface for daily operations

---

## 🔐 Demo Credentials

| Role     | Name               | Email                                                   | Password | Permissions                |
| -------- | ------------------ | ------------------------------------------------------- | -------- | -------------------------- |
| Admin    | Giorgio Napolitano | [napolitano@ministro.it](mailto:napolitano@ministro.it) |  admin   | Backoffice, Approve/Reject |
| Manager  | Giuseppe Emiliano  | [emilix@utente.it](mailto:emilix@utente.it)             |  admin   | Priority 1 & 2 Vehicles    |
| Employee | Mariano Luciani    | [mariano@utente.it](mailto:mariano@utente.it)           |  admin   | Priority 1 Vehicles Only   |

> ⚠️ Passwords are for testing purposes only.

---

## 🔄 Booking Workflow

1. **Request** → Status: *In Attesa (Pending)*
2. **Review** → Admin dashboard
3. **Approval / Rejection**
4. **Active Rental** displayed to user
5. **Return Vehicle** → Status reset to *Available*

---

## 📂 Project Structure

```plaintext
/fleetmaster
├── nginx/
│   └── nginx.conf
├── route/
├── db/
├── static/
├── templates/
├── app.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── LICENSE
└── README.md
```

---

## ⚖️ License

Released under the **MIT License**.
Copyright (c) 2025 **Giorgio Cappiello**.

