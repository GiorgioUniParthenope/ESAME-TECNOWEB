# 🚗 FleetMaster
### Corporate Fleet Management System

**FleetMaster** is a digital platform designed to simplify and streamline internal corporate fleet management. 

The system coordinates the activities of Administrators, Managers, and Employees, offering specific functionalities based on the user's role. It replaces manual, redundant processes with a centralized digital workflow, ensuring clear approval flows and optimized vehicle availability.

---

## 🎯 Key Objectives

* **Digitization:** Eliminate manual processes (paper, excel, emails) for vehicle booking.
* **Role-Based Access Control (RBAC):** Manage users with differentiated privileges (Admin, Manager, Employee).
* **Optimization:** Maximize vehicle utilization and ensure transparent tracking of approvals and returns.

---

## 👥 User Roles & Use Cases

FleetMaster features a strict hierarchy to ensure the right vehicles are available to the right people.

### 1. Administrator (Admin)
The **Admin** has full control over the platform. They do not book cars for themselves but manage the fleet and requests.
* **Dashboard:** Access to the "Backoffice" view.
* **Fleet Management:** Add, edit, or delete vehicles (CRUD).
* **Approval Workflow:** View pending requests and decide whether to **Approve** or **Reject** them.
* **Oversight:** Monitor the status of all vehicles (Available/Occupied).

### 2. Manager
The **Manager** represents mid-level management.
* **Vehicle Access:** Can book **Standard** vehicles (Priority 1) AND **Premium/Executive** vehicles (Priority 2).
* **Booking:** Can create booking requests including date ranges and notes.
* **History:** View their own booking history and status.

### 3. Employee (Impiegato)
The **Employee** represents the standard staff member.
* **Vehicle Access:** Can *only* book **Standard** vehicles (Priority 1). Premium vehicles are filtered out from their view.
* **Booking:** Simple booking interface for daily operational needs.

---

## 🔐 Demo Credentials

Use the following accounts to test the different perspectives of the application.

> **Note:** The password for all demo accounts is set to: `password` 
> *(Assuming the hash provided corresponds to a standard test password. If different, please update)*.

| Role | Name | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | **Giorgio Napolitano** | `napolitano@ministro.it` | Full Backoffice Access, Approve/Reject, CRUD Vehicles |
| **💼 Manager** | **Giuseppe Emiliano** | `emilix@utente.it` | Book Priority 1 & 2 Vehicles (Standard + Premium) |
| **👤 Employee** | **Mariano Luciani** | `mariano@utente.it` | Book Priority 1 Vehicles Only (Standard) |

---

## 🛠️ Technology Stack

* **Backend:** Python (Flask)
* **Database:** PostgreSQL (via SQLAlchemy ORM)
* **Frontend:** HTML5, Bootstrap 5, jQuery
* **Authentication:** Session-based with Scrypt hashing

---

## 🚀 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/fleetmaster.git](https://github.com/your-username/fleetmaster.git)
    cd fleetmaster
    ```

2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configuration:**
    Ensure the database URI in `app.py` is configured correctly (currently set to Railway PostgreSQL).

5.  **Run the Application:**
    ```bash
    python app.py
    ```
    The app will be available at `http://127.0.0.1:5000`.

---

## 🔄 Booking Workflow

1.  **Request:** An **Employee** or **Manager** logs in, selects a vehicle, dates, and adds notes. The request state becomes `In Attesa` (Pending).
2.  **Review:** The **Admin** sees the request in the Backoffice.
    * *Approve:* The vehicle becomes `Occupied`.
    * *Reject:* The user is notified (modal on next login).
3.  **Active Rental:** If approved, the user sees the "Active Rental" card.
4.  **Return:** The user clicks "Return Vehicle". The vehicle status resets to `Available`.

---

### ⚖️ License
This project is for educational and internal corporate use.