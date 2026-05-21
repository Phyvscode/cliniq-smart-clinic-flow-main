# ClinIQ Backend — REST API

Node.js + Express + MongoDB backend for the **ClinIQ Smart Clinic Management** system.

---

## 📁 Folder Structure

```
cliniq-backend/
├── server.js               # Entry point
├── .env.example            # Environment variable template
├── package.json
│
├── config/
│   ├── db.js               # MongoDB connection
│   └── jwt.js              # JWT sign / verify helpers
│
├── models/
│   ├── User.js             # Doctor, Reception, Admin
│   ├── Patient.js          # Patient records
│   ├── Queue.js            # Daily patient queue
│   ├── Prescription.js     # Prescriptions with medicines
│   └── Medicine.js         # Medicine catalogue
│
├── middleware/
│   ├── authMiddleware.js   # protect() + authorize(...roles)
│   ├── errorHandler.js     # Global error handler
│   └── validators.js       # express-validator rule sets
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── patientController.js
│   ├── queueController.js
│   ├── prescriptionController.js
│   └── medicineController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── patientRoutes.js
│   ├── queueRoutes.js
│   ├── prescriptionRoutes.js
│   └── medicineRoutes.js
│
└── utils/
    ├── AppError.js         # Custom error class
    └── seeder.js           # Demo data seeder
```

---

## 🚀 Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit MONGO_URI and JWT_SECRET

# 3. Seed demo data
npm run seed

# 4. Start development server
npm run dev
```

---

## 🔐 Authentication

All protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is returned from `/api/auth/login` or `/api/auth/signup`.

---

## 🗺️ API Reference

### Auth — `/api/auth`

| Method | Endpoint       | Access | Description          |
|--------|---------------|--------|----------------------|
| POST   | `/signup`     | Public | Register a new user  |
| POST   | `/login`      | Public | Login, get JWT token |
| GET    | `/me`         | Any    | Get current user     |
| POST   | `/logout`     | Any    | Acknowledge logout   |

**Login body:**
```json
{
  "email": "doctor@cliniq.com",
  "password": "password123",
  "role": "doctor"
}
```

---

### Users — `/api/users`

| Method | Endpoint       | Access        | Description           |
|--------|---------------|---------------|-----------------------|
| GET    | `/`           | Admin         | List all users        |
| GET    | `/doctors`    | Admin, Reception | List active doctors |
| GET    | `/:id`        | Admin         | Get user by ID        |
| PATCH  | `/:id`        | Admin         | Update user           |
| DELETE | `/:id`        | Admin         | Deactivate user       |

---

### Patients — `/api/patients`

| Method | Endpoint              | Access              | Description              |
|--------|-----------------------|---------------------|--------------------------|
| GET    | `/`                   | All staff           | List / search patients   |
| POST   | `/`                   | Admin, Reception    | Register new patient     |
| GET    | `/:id`                | All staff           | Get patient details      |
| PATCH  | `/:id`                | Admin, Reception    | Update patient           |
| DELETE | `/:id`                | Admin               | Deactivate patient       |
| GET    | `/:id/prescriptions`  | All staff           | Patient's prescription history |

**Query params for GET `/`:** `search`, `page`, `limit`

---

### Queue — `/api/queue`

| Method | Endpoint        | Access              | Description                  |
|--------|----------------|---------------------|------------------------------|
| GET    | `/`            | All staff           | Today's queue                |
| POST   | `/`            | Admin, Reception    | Add patient to queue         |
| GET    | `/stats`       | Admin               | Queue summary counts         |
| POST   | `/next`        | Admin, Doctor       | Call next waiting patient    |
| PATCH  | `/:id/status`  | All staff           | Update status                |
| DELETE | `/:id`         | Admin, Reception    | Remove from queue            |

**Status values:** `waiting` → `in-consultation` → `done`

---

### Prescriptions — `/api/prescriptions`

| Method | Endpoint | Access              | Description               |
|--------|---------|---------------------|---------------------------|
| GET    | `/`     | All staff           | List prescriptions        |
| POST   | `/`     | Doctor              | Create prescription       |
| GET    | `/:id`  | All staff           | Get prescription details  |
| DELETE | `/:id`  | Admin, Doctor (own) | Delete prescription       |

**Create prescription body:**
```json
{
  "patientId": "<mongoId>",
  "problems": ["Fever", "Cold & Cough"],
  "medicines": [
    {
      "medicineId": "<mongoId>",
      "morning": true,
      "afternoon": false,
      "evening": true,
      "night": false,
      "durationDays": 5
    }
  ],
  "notes": "Rest advised",
  "queueEntryId": "<mongoId>"
}
```

---

### Medicines — `/api/medicines`

| Method | Endpoint  | Access        | Description          |
|--------|----------|---------------|----------------------|
| GET    | `/`      | All staff     | List / search        |
| POST   | `/`      | Admin, Doctor | Add medicine         |
| POST   | `/bulk`  | Admin         | Bulk insert          |
| GET    | `/:id`   | All staff     | Get by ID            |
| PATCH  | `/:id`   | Admin, Doctor | Update               |
| DELETE | `/:id`   | Admin         | Remove (soft delete) |

**Query params for GET `/`:** `search`, `type`, `page`, `limit`

---

## 🧪 Demo Credentials (after seeding)

| Role      | Email                   | Password    |
|-----------|-------------------------|-------------|
| Doctor    | doctor@cliniq.com       | password123 |
| Reception | reception@cliniq.com    | password123 |
| Admin     | admin@cliniq.com        | password123 |

---

## 🛡️ Role Permissions Summary

| Resource       | Admin | Doctor | Reception |
|----------------|-------|--------|-----------|
| Users CRUD     | ✅    | ❌     | ❌        |
| Patients CRUD  | ✅    | Read   | ✅        |
| Queue manage   | ✅    | Call next | ✅     |
| Prescriptions  | ✅    | Own only | Read   |
| Medicines CRUD | ✅    | Create/Edit | Read |
