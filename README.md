# 🚗 FleetMaster

### Corporate Fleet Management System

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Docker-blue)
![Architecture](https://img.shields.io/badge/architecture-Microservices-purple)

**FleetMaster** is a digital platform designed to simplify and streamline internal corporate fleet management.

The system coordinates the activities of **Administrators**, **Managers**, and **Employees**, offering role-based functionalities. It replaces manual, redundant processes with a centralized digital workflow, ensuring clear approval flows and optimized vehicle availability.

---

## 📋 Exam Requirements Compliance

This project has been engineered to **strictly follow** the TechWeb exam guidelines regarding architecture and environment:

* ✅ **NO Windows / NO XAMPP**: The application is fully containerized using **Docker**. Regardless of the host OS, the runtime environment is **Linux** (Debian/Alpine).
* ✅ **Production-grade architecture (L.N.P.P. Stack)**:

  * **OS**: Linux (via Docker containers)
  * **Web Server**: Nginx (Reverse Proxy)
  * **App Server**: Gunicorn (WSGI)
  * **Language**: Python (Flask)
  * **Database**: PostgreSQL (Cloud instance via Railway)

---

## 🛠️ Technology Stack

| Component        | Technology              | Description                            |
| ---------------- | ----------------------- | -------------------------------------- |
| Containerization | Docker & Docker Compose | Linux-based environment orchestration  |
| Web Server       | Nginx                   | Reverse proxy and HTTP handling        |
| App Server       | Gunicorn                | Production WSGI server                 |
| Backend          | Python / Flask          | Core application logic and APIs        |
| Database         | PostgreSQL              | Relational database via SQLAlchemy ORM |
| Frontend         | Bootstrap 5 & jQuery    | Responsive UI/UX                       |

---

## 🚀 Installation & Setup

### 1. Prerequisites

* **Docker Desktop** installed and running
* Active internet connection (for remote PostgreSQL database)

### 2. Start the Environment

From the project root directory, run:

```bash
docker compose up --build
```

This command:

* Builds the Linux-based Docker images
* Installs Python dependencies from `requirements.txt`
* Starts the **Nginx** and **Web (Flask + Gunicorn)** containers

### 3. Access the Application

Once the containers are running, open your browser and visit:

👉 **[http://localhost](http://localhost)**

The application is exposed on **port 80** via Nginx.

---

## 👥 User Roles & Use Cases

FleetMaster enforces **Role-Based Access Control (RBAC)** to ensure correct vehicle usage.

### 👑 Administrator (Admin)

**Access**: Backoffice Dashboard

**Capabilities**:

* Full CRUD on fleet vehicles
* Approve or reject booking requests
* Monitor real-time vehicle status (Available / Occupied)

---

### 💼 Manager

**Privileges**:

* Can book **Standard (Priority 1)** and **Premium/Executive (Priority 2)** vehicles

**Capabilities**:

* Request vehicles for specific date ranges
* View personal booking history

---

### 👤 Employee (Impiegato)

**Privileges**:

* Can book **Standard vehicles only (Priority 1)**
* Premium vehicles are hidden

**Capabilities**:

* Simple booking interface for daily operational needs

---

## 🔐 Demo Credentials

Use the following accounts to test the platform:

| Role     | Name               | Email                                                   | Password | Permissions                |
| -------- | ------------------ | ------------------------------------------------------- | -------- | -------------------------- |
| Admin    | Giorgio Napolitano | [napolitano@ministro.it](mailto:napolitano@ministro.it) | password | Backoffice, Approve/Reject |
| Manager  | Giuseppe Emiliano  | [emilix@utente.it](mailto:emilix@utente.it)             | password | Priority 1 & 2 Vehicles    |
| Employee | Mariano Luciani    | [mariano@utente.it](mailto:mariano@utente.it)           | password | Priority 1 Vehicles Only   |

> ⚠️ **Note**: Passwords are set to `password` for testing purposes only, based on the provided hashes.

---

## 🔄 Booking Workflow

1. **Request**
   Employee or Manager selects a vehicle, date range, and notes. Status becomes **In Attesa (Pending)**.

2. **Review**
   Admin reviews the request in the Backoffice dashboard.

3. **Approval / Rejection**

   * **Approved**: Vehicle status becomes **Occupied**
   * **Rejected**: User is notified via modal on next login

4. **Active Rental**
   Approved users see an **Active Rental** card on their dashboard.

5. **Return**
   User clicks **Return Vehicle** → vehicle status resets to **Available**.

---

## 📂 Project Structure

```plaintext
/fleetmaster
├── nginx/
│   └── nginx.conf       # Nginx reverse proxy configuration
├── route/               # Helper modules (e.g. login_required)
├── db/                  # Create database FleetMaster
├── static/              # CSS, JS, images
├── templates/           # Jinja2 HTML templates
├── app.py               # Main Flask application
├── Dockerfile           # Python/Linux image definition
├── docker-compose.yml   # Services orchestration
├── requirements.txt     # Python dependencies
├── LICENSE              # MIT License
└── README.md            # Project documentation
```

---

## ⚖️ License

This project is released under the **MIT License**.

Copyright (c) 2025 Giorgio Cappiello

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
