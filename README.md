<div align="center">
  <img src="client/public/logo.png" alt="PATHPROHORI Logo" width="140" />
  <h1>PATHPROHORI</h1>
  <p><strong>A Hyperlocal Crime Mapping & Commuter Transit Security Ecosystem</strong></p>
  <p><em>BRAC University • CSE471: System Analysis and Design • Group 4 (Summer 2026)</em></p>
</div>

---

## 📌 Project Overview

**PATHPROHORI** is a specialized digital safety ecosystem built to protect commuters, with a particular focus on enhancing transit safety during daily travel in Bangladesh. The platform combines a community-driven hazard reporting map with active transit monitoring and an instant emergency response system. 

If a traveler encounters a threat, loses internet connection, or faces an emergency, the system coordinates immediate multi-channel alerts to connect the user with their family, guardians, and safety operators instantly.

---

## 👥 Project Team (Group No. 4 - Lab Section 1)

| SL | Student ID | Name | Role Assignment |
| :-: | :--- | :--- | :--- |
| 1 | **23101243** | **Md Saqline Hossain** | Lead Developer & System Analyst |
| 2 | **23101017** | **Badrunnaher Pantho** | Developer & UI/UX Specialist |
| 3 | **22201850** | **Mehedi Hasan Shovon** | Backend Developer & QA Specialist |
| 4 | **22201680** | **Jamshedul Alam Khan Hridoy** | System Architect & Security Lead |

---

## 🛠️ Tech Stack & Dependencies

- **Frontend**: React.js (Vite PWA), TailwindCSS, Leaflet.js & OpenStreetMap (OSM), Lucide Icons, Socket.io Client, Axios.
- **Backend**: Node.js, Express.js, Socket.io (WebSockets for live streaming), `node-cron` (automated task scheduler), `jsonwebtoken`, `bcryptjs`.
- **Database & ORM**: MongoDB Atlas & Mongoose (with `2dsphere` geospatial indexing for location coordinates).
- **Architecture**: Decoupled Client-Server MERN Architecture with root workspace concurrent execution.

---

## 🚀 Common Functional Requirements (Common Workflows)

### 1. 🔐 MERN Authentication System
- Secure user registration and login endpoints for **Commuters**, **Guardians**, **Safety Operators**, and **Admins**.
- Passwords are encrypted on the backend using `bcryptjs`.
- Stateless user sessions are securely managed via JSON Web Tokens (`JWT`) stored on the client side.

### 2. 📡 Signal Loss Heartbeat Tracker
- The backend server runs a background monitoring routine via Socket.io connection manager ([heartbeatService.js](server/src/services/heartbeatService.js)).
- Active commuters send heartbeat pings every 15 seconds.
- If a client's internet data connection drops or fails to send a ping for **more than 2 minutes (120 seconds)** mid-journey, the system automatically triggers a `SIGNAL_LOST` alert to guardians and operators.

### 3. 🧹 48-Hour Privacy Data Eraser
- A `node-cron` scheduler ([privacyCron.js](server/src/services/privacyCron.js)) runs daily at midnight (`0 0 * * *`).
- Queries the MongoDB database to permanently purge all precise historical latitude/longitude coordinate logs for safe completed trips older than 48 hours, ensuring user privacy compliance.

---

## 📱 Core Application Modules

### Module 1: Hazard Mapping & Community Verification
- **Map-Based Incident Submission**: Drop interactive pins on Leaflet map with hazard descriptions.
- **Live Localized Danger Feed**: Auto-reads phone GPS to display threats reported within 5 to 20 km.
- **Community Verification (Upvote System)**: Reports receiving 10+ citizen upvotes gain a "Community Verified" badge.
- **Public Discussion Threads**: Live update boards for nearby commuters to comment traffic and safety updates.

### Module 2: Active Transit Monitoring & Panic Controls
- **Street-Hailed Transport Logger**: Save vehicle plate number (CNG/Rickshaw) before starting trips.
- **One-Tap Instant Panic Button**: Emergency button putting the app into critical alert mode instantly.
- **Voice-Activated Hands-Free Trigger**: Local microphone listener for user's secret emergency phrase (*e.g., "Lavender Moonlight"*).
- **Dual-PIN Silent Duress Deactivation**: "Fake PIN" interface that secretly upgrades alert priority to max level while appearing to disarm on-screen.

### Module 3: Guardian Broadcasting & Emergency Operations
- **Self-Destructing Tracking Links**: Live map streaming links for guardians expiring after 4 hours or trip completion.
- **Low-Bandwidth Evidence Locker**: Silent background capture of compressed photos/audio during panic states.
- **Dead-Battery Emergency Blast**: Automatic coordinate broadcast when battery drops to 5% before shutdown.
- **Offline Memory Storage Queue**: Stores travel coordinates in local storage when offline and uploads upon reconnecting.
- **Admin Law-Enforcement PDF Export**: One-click structured PDF crime report generator for police dispatch.

---

## 📁 Repository Structure

```
pathprohori/
├── client/                     # React Vite PWA Frontend
│   ├── public/
│   │   └── logo.png            # Official transparent shield logo emblem
│   ├── src/
│   │   ├── components/         # Header, Sidebar, Footer, ProtectedRoute
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── pages/              # Login, Register, Dashboard, LogJourney, LiveDangerFeed, IncidentDiscussion, VoiceSettings
│   │   ├── services/           # Axios API client
│   │   ├── App.jsx             # Main Router wrapper
│   │   └── main.jsx
│   ├── tailwind.config.js      # Figma color palette tokens (#6B4355 plum)
│   ├── vite.config.js
│   └── package.json
├── server/                     # Node.js Express & Socket.io Backend
│   ├── src/
│   │   ├── config/             # MongoDB Mongoose Atlas connection
│   │   ├── middleware/         # Auth JWT verification & role authorization
│   │   ├── models/             # User, Trip, LocationLog, Incident schemas
│   │   ├── routes/             # Auth, Trip, Incident endpoints + auto-seeding
│   │   ├── services/           # Signal Loss Heartbeat monitor & 48-Hour Privacy Eraser
│   │   └── server.js           # Server entry point
│   ├── .env.example
│   └── package.json
├── package.json                # Root launcher for running client & server concurrently
└── README.md
```

---

## 🔑 Demo Login Credentials

You can test the application using the pre-seeded team and test user accounts:

| Name / Role | Email | Password | Assigned Role |
| :--- | :--- | :--- | :--- |
| **Md Saqline Hossain** | `saqline.hossain@g.bracu.ac.bd` | `Saqline2026!` | `commuter` |
| **Badrunnaher Pantho** | `badrunnaher.pantho@g.bracu.ac.bd` | `Pantho2026!` | `guardian` |
| **Mehedi Hasan Shovon** | `mehedi.hasan.shovon@g.bracu.ac.bd` | `Shovon2026!` | `operator` |
| **Jamshedul Alam Khan Hridoy** | `jamshedul.alam@g.bracu.ac.bd` | `Hridoy2026!` | `admin` |
| **Demo Commuter** | `commuter@pathprohori.com` | `pass1234` | `commuter` |
| **Demo Guardian** | `guardian@pathprohori.com` | `pass1234` | `guardian` |

---

## ⚡ Getting Started (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account / Connection URI

### Installation & Run Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/saqlinehossain1/pathprohori.git
   cd pathprohori
   ```

2. **Install Root, Client & Server Dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   Create a `.env` file inside `server/` (refer to `server/.env.example`):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://saqlinehussain:Donottry2@cluster0.lgfmhge.mongodb.net/pathprohori?retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=pathprohori_super_secret_jwt_key_2026_cse471
   CLIENT_URL=http://localhost:5173
   ```

4. **Launch Application (Server + Client Concurrently)**:
   From the project root directory:
   ```bash
   npm run dev
   ```
   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`

---

## 📄 License
This project is developed as part of the **CSE471: System Analysis and Design** course curriculum at **BRAC University**.
