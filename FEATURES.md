# 🛡️ PATHPROHORI - Complete Features List

## Project Overview
**PATHPROHORI** is a hyperlocal crime mapping and commuter transit security ecosystem designed to enhance safety during daily travel in Bangladesh. It combines community-driven hazard reporting, real-time transit monitoring, and instant emergency response systems.

---

## 🎯 Core Features by Module

### **Module 1: Hazard Mapping & Community Verification**

#### 1.1 Map-Based Incident Submission
- Interactive Leaflet map with OpenStreetMap (OSM) integration
- Drop pins directly on map to report hazards
- Add hazard title, location name, and severity level
- Optional detailed description of the incident
- Upload incident photos using Cloudinary
- Real-time GPS location detection for automatic positioning

#### 1.2 Live Localized Danger Feed
- Automatically displays threats reported within 5-20 km of user's location
- Real-time GPS tracking to calculate live distances
- Hazard severity color-coded visualization
- Instant feed updates as new incidents are reported
- Filter incidents by proximity and severity level

#### 1.3 Community Verification System (Upvote/Downvote)
- Citizens can upvote reports they confirm as accurate
- Downvote option to dispute false or misleading reports
- Reports receiving 10+ upvotes earn a "Community Verified" badge
- Transparent voting counts displayed on each incident
- Exclusive voting mechanism (can't both upvote and downvote)

#### 1.4 Public Discussion Threads
- Live comment and update board for each incident
- Community members can post traffic and safety updates
- **Three-level discussion system:**
  - Main comments on the incident
  - Nested replies to specific comments
  - Like/Dislike voting on comments for verification
- Photo attachment support for comments (via Cloudinary)
- Comment editing and deletion by authors/admins
- Real-time comment count display
- Author identification with avatar and name
- "(edited)" indicator for modified comments

---

### **Module 2: Active Transit Monitoring & Panic Controls**

#### 2.1 Street-Hailed Transport Logger
- Save vehicle plate number (CNG/Rickshaw/Taxi) before starting trips
- Pre-journey registration for tracking vehicle details
- Integration with guardian notification system

#### 2.2 One-Tap Instant Panic Button
- Emergency activation button easily accessible on dashboard
- Immediately puts app into critical alert mode
- Sends emergency alerts to connected guardians and operators
- Triggers live location tracking for responders
- Visual and audio feedback confirmation

#### 2.3 Voice-Activated Hands-Free Trigger
- Local microphone listener for secret emergency phrases
- User can set custom emergency voice command (e.g., "Lavender Moonlight")
- Hands-free activation during critical moments
- No internet required for voice detection
- Microphone permission management

#### 2.4 Dual-PIN Silent Duress Deactivation
- "Fake PIN" interface for duress situations
- Appears to disarm on-screen but secretly escalates alert priority
- Allows user to disarm panic button under pressure without alerting threat
- Separate real PIN for actual deactivation
- Admin notification for duress attempts

#### 2.5 Route Deviation & Unexpected Stop Detection
- Continuously compares live GPS position against the trip's planned route
- Flags a route deviation if the commuter stays >150m off-route for 30+ seconds
- Flags an unexpected stop if position doesn't change beyond 20m for 5+ minutes
- Sends an in-app safety check ("I'm Safe" button, 2-minute countdown) before ever alerting guardians
- Automatically escalates to guardians and the safety operator dashboard through the same
  panic-button pathway (Emergency record, Twilio SMS/voice, email, push, Socket.io) if the
  commuter doesn't respond in time, tagged with the triggering reason
- Distinct from GPS/connectivity gaps, which remain owned by the Signal Loss Heartbeat Tracker
- **Known limitation:** there is no way to pre-mark a stop as an intentional pickup/errand -
  a genuinely planned stop still triggers a safety check, resolved with one tap

---

### **Module 3: Guardian Broadcasting & Emergency Operations**

#### 3.1 Self-Destructing Tracking Links
- Live map streaming links for guardians
- Links automatically expire after 4 hours
- Links expire immediately upon trip completion
- Secure token-based link generation
- Limited access to prevent unauthorized tracking

#### 3.2 Low-Bandwidth Evidence Locker
- Silent background capture of compressed photos during panic states
- Audio recording capability (low bandwidth optimization)
- Automatic evidence storage with timestamps
- Evidence accessible only to user and authorized operators
- Compression to minimize data usage

#### 3.3 Dead-Battery Emergency Blast
- Automatic location broadcast when battery drops to 5%
- Final coordinate transmission before shutdown
- Critical notification to guardians and safety operators
- Ensures help can reach user even if phone dies

#### 3.4 Offline Memory Storage Queue
- Stores travel coordinates in local storage when offline
- Automatic upload when internet connection is restored
- Location history preserved even during connectivity loss
- No data loss during offline periods

#### 3.5 Admin Law-Enforcement PDF Export
- One-click structured PDF crime report generation
- Police-ready formatted incident documentation
- Includes all incident details, comments, and evidence
- Timestamp and author information included
- Ready for law enforcement dispatch

---

## 🔐 Authentication & Security

### MERN Authentication System
- Secure user registration and login for four roles:
  - **Commuters** - Daily transit users
  - **Guardians** - Family members watching over commuters
  - **Safety Operators** - Professional emergency responders
  - **Admins** - Platform administrators
- Password encryption using **bcryptjs**
- Stateless sessions managed via **JSON Web Tokens (JWT)**
- Role-based access control (RBAC)
- Secure token storage on client-side
- Protected API endpoints with middleware verification

---

## 🔄 Background Services

### Signal Loss Heartbeat Tracker
- Backend monitoring via Socket.io connection manager
- Commuters send heartbeat pings every 15 seconds during active journey
- Auto-triggers **SIGNAL_LOST** alert if:
  - Internet connection drops
  - No ping received for more than 2 minutes (120 seconds)
- Instant notification to guardians and operators
- Critical for detecting communication failures

### 48-Hour Privacy Data Eraser
- Automated `node-cron` scheduler (runs daily at midnight)
- Permanently deletes precise location coordinates for completed trips older than 48 hours
- Ensures user privacy and GDPR compliance
- Maintains recent trip data for active/ongoing journeys
- Automatic database cleanup without manual intervention

---

## 👤 Role-Based Features

### Commuter Features
- Report hazards on interactive map
- View live danger feed
- Log journey with transport details
- Activate panic button
- Set emergency voice command
- View guardian tracking links
- Participate in incident discussions
- Upload photos as evidence

### Guardian Features
- Receive emergency notifications
- View live tracking links for assigned commuters
- Monitor heartbeat status
- Access to evidence locker
- Receive battery warnings
- Participate in discussions (as "Verified Guardian")

### Safety Operator Features
- View all incidents and reports
- Monitor active commuters
- Respond to emergencies
- Edit/manage incident reports
- View evidence from multiple commuters
- Export PDF crime reports

### Admin Features
- Full system access
- User management
- Report moderation
- Evidence review
- System analytics
- Delete harmful content
- Platform configuration

---

## 🗺️ Technical Features

### Frontend Technologies
- **React.js** with Vite PWA (Progressive Web App)
- **TailwindCSS** for responsive design
- **Leaflet.js** + OpenStreetMap for mapping
- **Socket.io Client** for real-time updates
- **Axios** for API communication
- **Lucide Icons** for UI icons
- Geolocation API for GPS tracking
- Microphone API for voice commands
- Local Storage for offline data

### Backend Technologies
- **Node.js** with Express.js
- **Socket.io** for WebSocket real-time streaming
- **node-cron** for automated task scheduling
- **jsonwebtoken** for authentication
- **bcryptjs** for password encryption
- **** with Mongoose ORM
- **2dsphere geospatial indexing** for location queries
- **Cloudinary** for image storage and management

### Database Models
- **Users** - Commuters, Guardians, Operators, Admins
- **Incidents** - Hazard reports with geolocation
- **Trips** - Journey logs with vehicle details
- **LocationLogs** - Historical coordinates
- **Comments** - Discussion threads
- **Evidence** - Captured photos and audio

---

## 📊 Key Metrics & Indicators

- **Community Verification Badge** - 10+ upvotes required
- **Danger Feed Range** - 5-20 km from user location
- **Heartbeat Interval** - Every 15 seconds
- **Signal Loss Threshold** - 120 seconds (2 minutes)
- **Privacy Retention** - 48 hours for location data
- **Tracking Link Expiry** - 4 hours or trip completion
- **Battery Alert** - 5% charge warning
- **Voice Command Detection** - Local (no internet required)

---

## 🎨 User Interface

- **Dashboard** - Central hub with quick access buttons
- **Live Danger Feed** - Scrollable incident list with map view
- **Incident Discussion** - Comment thread with nested replies
- **Journey Logger** - Vehicle registration and trip tracking
- **Voice Settings** - Emergency phrase configuration
- **Emergency Controls** - Panic button and duress PIN
- **Map Picker** - Interactive location selection
- **Evidence Locker** - Captured photos/audio gallery
- **Tracking Links** - Guardian access management
- **Admin Panel** - System management interface

---

## 🔔 Notification System

- **Emergency Alerts** - Multi-channel to guardians & operators
- **Heartbeat Alerts** - Signal loss notifications
- **Battery Warnings** - Low battery notifications
- **Duress Alerts** - Silent alerts on fake PIN entry
- **Comment Notifications** - New discussion updates (optional)
- **Incident Updates** - Nearby hazard notifications
- **Verification Badges** - When reports reach 10 upvotes

---

## 🚀 Performance Features

- **Real-time Updates** - Socket.io WebSocket connections
- **Offline Capability** - PWA with offline storage
- **Low-Bandwidth Optimization** - Compressed evidence capture
- **Geospatial Queries** - MongoDB 2dsphere indexing
- **Concurrent Execution** - Root workspace for parallel processing
- **Live GPS Updates** - Continuous location tracking
- **Instant Panic Response** - Sub-second alert transmission

---

## 📱 Responsive Design

- Mobile-first design approach
- Works seamlessly on all device sizes
- Touch-optimized controls
- PWA installation support
- Offline-first architecture
- Progressive enhancement

---

## 🔒 Security & Privacy

- End-to-end encrypted communication (JWT)
- Password hashing with bcryptjs
- Role-based access control (RBAC)
- Protected API endpoints
- Secure token storage
- 48-hour automatic data deletion
- GDPR-compliant privacy handling
- Evidence integrity tracking
- Admin audit logs

---

## 📈 Future Enhancement Opportunities

- AI-powered incident clustering
- Real-time crime statistics
- Mobile app native version (React Native)
- Advanced analytics dashboard
- Integration with police departments
- SMS/WhatsApp emergency alerts
- Multi-language support
- Blockchain evidence verification
- Machine learning for threat prediction

---

## 🎓 Educational Context

**Project:** CSE471 - System Analysis and Design  
**Institution:** BRAC University  
**Semester:** Summer 2026  
**Team:** Group 4, Lab Section 1  

**Team Members & Responsibilities:**
- **Md Saqline Hossain** - Lead Developer & System Analyst
- **Badrunnaher Pantho** - Developer & UI/UX Specialist (Public Discussion Threads)
- **Mehedi Hasan Shovon** - Backend Developer & QA Specialist
- **Jamshedul Alam Khan Hridoy** - System Architect & Security Lead

---

## 📄 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, Vite, TailwindCSS, Leaflet, Socket.io Client |
| **Backend** | Node.js, Express.js, Socket.io Server, node-cron |
| **Database** | , Mongoose |
| **Storage** | Cloudinary (images) |
| **Authentication** | JWT, bcryptjs |
| **Architecture** | MERN (Decoupled Client-Server) |
| **Real-time** | WebSocket (Socket.io) |
| **Geolocation** | Leaflet.js + OpenStreetMap |

---

## 🎯 Value Proposition

**PATHPROHORI** provides Bangladesh's commuters with:
✅ Community-verified safety information  
✅ Instant emergency response coordination  
✅ Privacy-first location tracking  
✅ Offline-capable mobile experience  
✅ Real-time hazard awareness  
✅ Guardian peace of mind  
✅ Professional emergency response integration  

**For a safer, connected commuting experience.**

---

*Last Updated: August 16, 2026*
