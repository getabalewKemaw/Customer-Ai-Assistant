📐 Refined Database Design for Supportly (MVP)
1. Users Collection
Purpose: Store user accounts (dual auth), roles, and profile info.
Schema (MVP fields):
•	_id: ObjectId → primary key.
•	name: String (required) → display name (manual or from Google).
•	email: String (required, unique, indexed) → universal identifier.
•	password: String (optional) → hashed, for email/password users only.
•	googleId: String (optional, unique) → for Google users only.
•	authMethods: [String] (required) → enum: ['email','google']. Tracks enabled login methods.
•	role: String (required, default: 'customer') → enum: ['customer','agent','admin'].
•	profilePicture: String (optional) → URL (Google or uploaded).
•	isVerified: Boolean (default: false) → email verification status.
•	lastLogin: Date (optional) → last active timestamp.
•	createdAt: Date (default: now)
•	updatedAt: Date (default: now)
👉 Why these fields?
•	Covers both auth flows (Google + email).
•	Roles give us RBAC immediately.
•	Profile + verification keep it professional.
•	Everything else (preferences, company, etc.) can wait.
________________________________________
2. Sessions Collection
Purpose: Track logins, tokens, and expirations.
Schema (MVP fields):
•	_id: ObjectId
•	userId: ObjectId (ref Users) → link to the user.
•	token: String (required) → JWT (or session ID).
•	authMethod: String (required) → 'google' | 'email'.
•	deviceInfo: String (optional) → browser/user-agent.
•	ipAddress: String (optional) → security/audit.
•	expiresAt: Date (required) → TTL for session.
•	createdAt: Date (default: now)
👉 Why these fields?
•	Core for session management.
•	Minimal but secure.
•	TTL index on expiresAt auto-cleans old sessions.
________________________________________
3. Companies Collection (Phase 2, but keep structure ready)
Purpose: Support multi-tenant organizations.
Schema (MVP fields):
•	_id: ObjectId
•	name: String (required)
•	domain: String (optional, unique)
•	plan: String (default: 'free') → 'free' | 'pro' | 'enterprise'.
•	createdAt: Date
👉 Why keep it lean?
•	For MVP, only needed if you’re targeting multi-org SaaS.
•	Billing/settings can come later.
________________________________________
4. Tickets Collection
Purpose: Core of Supportly — customer requests.
Schema (MVP fields):
•	_id: ObjectId
•	title: String (required) → short summary.
•	description: String (required) → customer’s issue.
•	status: String (default: 'open') → 'open','in-progress','resolved','closed'.
•	priority: String (default: 'medium') → 'low','medium','high','urgent'.
•	customerId: ObjectId (ref Users, required)
•	assignedTo: ObjectId (ref Users, optional) → agent.
•	companyId: ObjectId (ref Companies, optional)
•	createdAt: Date (default: now)
•	updatedAt: Date (default: now)
👉 Why these fields?
•	This is Zendesk/Jira-lite.
•	Status + priority enable workflow.
•	Minimal relationships: who raised it, who’s handling it.
________________________________________
5. Messages Collection
Purpose: Store conversations within a ticket.
Schema (MVP fields):
•	_id: ObjectId
•	ticketId: ObjectId (ref Tickets, required)
•	senderId: ObjectId (ref Users, required)
•	content: String (required) → message text.
•	isAIGenerated: Boolean (default: false) → Gemini messages flagged.
•	createdAt: Date (default: now)
👉 Why minimal?
•	Core chat functionality (AI + customer + agent).
•	Attachments, read receipts, etc. can come later.
________________________________________
6. KnowledgeBase Collection
Purpose: AI reference material.
Schema (MVP fields):
•	_id: ObjectId
•	title: String (required)
•	content: String (required)
•	category: String (optional)
•	visibility: String (default: 'public') → 'public' or 'internal'.
•	createdAt: Date
•	updatedAt: Date
👉 Why keep it simple?
•	Enough for Gemini to fetch answers.
•	Related articles, versioning later.
________________________________________
7. Logs Collection
Purpose: Security + system monitoring.
Schema (MVP fields):
•	_id: ObjectId
•	userId: ObjectId (optional) → who triggered it.
•	action: String (required) → e.g., 'login','ticket_created'.
•	details: Object (optional) → contextual data.
•	severity: String (default: 'info') → 'info','warn','error'.
•	timestamp: Date (default: now)
👉 Why?
•	Even in MVP, logs help debug auth + tickets.
________________________________________
8. Feedback Collection
Purpose: Customer ratings for tickets.
Schema (MVP fields):
•	_id: ObjectId
•	ticketId: ObjectId (ref Tickets, required)
•	agentId: ObjectId (ref Users, optional)
•	rating: Number (1–5)
•	comments: String (optional)
•	createdAt: Date
👉 Why?
•	Immediate feedback loop for support quality.
Puzzle 1 — Project skeleton & infra sanity check
Description
Create the project skeleton and baseline infra that every other task depends on: src/ structure, index.js (or server.js), dotenv loading, Express app, MongoDB connection, ESLint/Prettier, and a simple health route.
Difficulty: Easy
Tools: Node.js, npm, Express, Mongoose, dotenv, ESLint/Prettier, nodemon (dev)
References: Official Express docs, Mongoose docs, dotenv docs
Acceptance criteria / Tests
•	src/index.js starts Express and returns 200 OK on GET /health with { ok: true }.
•	Environment variables load from .env (log them on start in non-prod for verification).
•	Mongoose connects to MongoDB and logs “mongo connected”.
•	Project adheres to lint rules; npm run dev works.
Pitfalls / Notes
•	Don’t use deprecated connection options (Mongoose v6+ handles topology internally).
•	Keep secrets out of git; add .env to .gitignore.
Deliverables
•	Folder structure (config, controllers, routes, models, middleware, util).
•	src/index.js + src/config/db.js + .env.sample.
________________________________________


Puzzle 2 — Users model (dual auth ready)
Description
Design and implement the User model to support both Google OAuth and email/password signups. Include fields mentioned in your refined schema (email unique, password hashed, googleId optional, authMethods, role, timestamps).
Difficulty: Medium
Tools: Mongoose, bcrypt (or bcryptjs), crypto for helper functions
Acceptance criteria / Tests
•	You can create a user with email/password; password is stored hashed.
•	You can create/find a user that has only googleId and no password.
•	Indexes exist for email (unique) and googleId (sparse unique).
•	Add unit tests: create user, match password, prevent duplicate emails.
Pitfalls / Notes
•	Use sparse: true for googleId index if it can be null.
•	Validate email format server-side and use lowercase: true for storage.
•	Don’t store a plain confirmPassword field in DB — only validate at API level.
Deliverables
•	src/models/User.js, user creation tests, migration notes (if needed).
________________________________________
Puzzle 3 — Local auth endpoints + JWT session issuance
Description
Implement email/password registration and login endpoints that issue a JWT (cookie + JSON). Create /auth/register, /auth/login. Add requireAuth middleware that validates JWT and attaches req.user.
Difficulty: Medium
Tools: jsonwebtoken, bcrypt, cookie-parser, express-validator (or zod) for input validation
Acceptance criteria / Tests
•	POST /auth/register creates user and returns JWT cookie and JSON { success: true }.
•	POST /auth/login verifies credentials and returns JWT cookie & JSON.
•	GET /auth/me (protected) returns user profile when cookie or Authorization: Bearer present.
•	Unit/integration tests for register/login/me flows.
Pitfalls / Notes
•	Keep JWT secret in .env. Use strong secret and httpOnly cookie.
•	Attach token to both cookie and JSON (for API clients) during dev if useful. Remove JSON token in production for safety.
•	Handle race conditions/duplicate email gracefully (409).
Deliverables
•	src/controllers/authLocalController.js, src/routes/authRoutes.js, src/middleware/authMiddleware.js.
________________________________________
Puzzle 4 — Google OAuth flow (server-side)
Description
Implement /auth/google (redirect to Google) and /auth/google/callback (exchange code, verify id_token, create/find user, sign app JWT, set cookie). Add state CSRF protection and store refresh_token hashed.
Difficulty: Medium
Tools: google-auth-library, cookie-parser, crypto, Mongoose User model
Acceptance criteria / Tests
•	Visiting GET /auth/google opens consent screen and returns to frontend with ?login=success after approval.
•	Backend creates or updates user, stores hashed refresh token, and sets token cookie (HttpOnly).
•	GET /auth/me works after Google login.
Pitfalls / Notes
•	Ensure redirect URI in Google console exactly matches callback URL.
•	Use access_type=offline + prompt=consent if you need refresh tokens (store them hashed!).
•	Fix env typos (GOOGLE_CLIENT_SECRET vs GOOLE_...).
Deliverables
•	src/controllers/authController.js (googleCallback logic), updated userService to save google refresh token hashed.
________________________________________
Puzzle 5 — Sessions & refresh token flow
Description
Implement Sessions collection and the refresh-token endpoint. Store refresh tokens hashed, support rotation: on refresh, remove old refresh token and add the new one (rotate).
Difficulty: Medium–Hard
Tools: Mongoose Sessions model, crypto (SHA256), JWT sign/verify
Acceptance criteria / Tests
•	POST /auth/refresh accepts a refresh token, returns new access token and new refresh token.
•	Old refresh token is removed (or marked invalid) after rotation.
•	Sessions collection entries are created with expiresAt TTL.
Pitfalls / Notes
•	Hash refresh tokens before storing (use SHA-256).
•	Don’t leak refresh tokens in responses or logs.
•	Consider deviceInfo to support per-device revocation.
Deliverables
•	src/models/Session.js, src/controllers/tokenController.js (refresh endpoint), tests for rotation & revocation.
________________________________________
Puzzle 6 — Token blacklist & logout (server-side revocation)
Description
Implement a TokenBlacklist (or TokenRevocation) collection with TTL indexed expiresAt. Update logout endpoint to add current JWT to blacklist and clear session / cookie. Modify requireAuth middleware to consult blacklist.
Difficulty: Medium
Tools: Mongoose, TTL index
Acceptance criteria / Tests
•	POST /auth/logout blacklists current JWT (stores with expiry = token expiry), clears cookie.
•	Any subsequent requests using that JWT (even manually via Postman) fail with 401 and Token revoked.
•	Blacklist entries auto-delete via TTL after token expiry.
Pitfalls / Notes
•	Blacklist check adds a DB lookup per protected request (OK for MVP). For scale use Redis.
•	Ensure you decode token to get exp for TTL value.
Deliverables
•	src/models/TokenBlacklist.js, updated requireAuth to call isBlacklisted.
________________________________________
Puzzle 7 — Tickets & Messages core API
Description
Implement ticket creation, assignment, and message posting endpoints. Minimal operations: create ticket, update status, post message, fetch ticket with messages (paginated).
Difficulty: Medium
Tools: Mongoose Ticket & Message models, Express routes, pagination library (or manual)
Acceptance criteria / Tests
•	POST /tickets creates a ticket with customerId from req.user.
•	GET /tickets/:id returns ticket + messages (paginated).
•	POST /tickets/:id/messages appends a message (customer or agent) and stores isAIGenerated: false for user messages.
•	PATCH /tickets/:id allows agent to change status/assign.
Pitfalls / Notes
•	Validate assignedTo is an agent (role) before assigning.
•	Use indexes ticketId + createdAt for message retrieval performance.
Deliverables
•	src/models/Ticket.js, src/models/Message.js, controllers and routes for tickets/messages.
________________________________________
Puzzle 8 — Attachments (upload & metadata)
Description
Support file attachments for tickets/messages/users. MVP: accept URLs and uploads via multipart (store metadata, and optionally push files to cloud storage later).
Difficulty: Medium
Tools: multer (for multipart), cloud storage SDK (later), Mongoose Attachment model
Acceptance criteria / Tests
•	POST /tickets/:id/attachments accepts either a URL or file upload, returns attachment metadata (fileUrl, fileType, uploadedBy).
•	Attachments are linked to ticketId or messageId via relatedTo & relatedModel.
•	Retrieval endpoint GET /attachments/:id returns metadata (files served via cloud/public URL).
Pitfalls / Notes
•	Don’t store large base64 blobs in DB. Store files in S3/GCS and keep URLs in DB.
•	Validate file types and size limits to prevent abuse. Scan files if needed (virus scanning later).
Deliverables
•	src/models/Attachment.js, multipart upload route, URL ingestion logic.
________________________________________
Puzzle 9 — Gemini integration (text + image flows)
Description
Wire Gemini endpoints to generate AI responses for tickets. Two endpoints: /ai/text (prompt + context), /ai/image (prompt + image handling). Store raw AI output in Message.rawResponse and create Message with isAIGenerated:true.
Difficulty: Medium–Hard
Tools: @google/genai (or appropriate SDK), base64 conversion for remote images, controllers, Message model
Acceptance criteria / Tests
•	POST /ai/text returns an AI response and stores it as a message in the correct ticket.
•	POST /ai/image accepts an image URL, fetches and base64-encodes it if required, sends to Gemini, stores response.
•	Responses include provenance: model name, request/response ids in rawResponse.
Pitfalls / Notes
•	Images must be passed as base64 if SDK expects bytes — fetch and convert server-side.
•	Watch for token errors and model availability (use correct model names). Rate-limit AI calls to avoid surprise bills.
Deliverables
•	src/controllers/aiController.js, endpoints wired into ticket flows, tests in Postman.
________________________________________
Puzzle 10 — Security & hardening (rate limits, CORS, helmet)
Description
Add middleware: CORS, Helmet, rate limiting on public/AI endpoints, input validation, and sanitize user inputs.
Difficulty: Easy–Medium
Tools: helmet, express-rate-limit, cors, express-validator / zod
Acceptance criteria / Tests
•	GET /health still works; AI endpoints limited (e.g., 10 requests/min per IP).
•	Input payloads validated and rejected with 400 if malformed.
•	CORS only allows frontend origin(s) in production.
Pitfalls / Notes
•	Dev vs Prod config for CORS and rate limits.
•	Keep rate limits adjustable via env.
Deliverables
•	src/middleware/rateLimiter.js, validation middleware, updated index.js.
________________________________________
Puzzle 11 — Logging & centralized error handling
Description
Integrate request logging (morgan / winston), structured error handler middleware, and persistent audit logging collection for important events.
Difficulty: Easy–Medium
Tools: morgan, winston, Mongoose AuditLog model
Acceptance criteria / Tests
•	All requests logged to console during dev; critical errors logged to a file or external service.
•	Error responses are standardized: { success:false, error: "message" }.
•	Important events (login, logout, ticket create) write an audit log entry.
Pitfalls / Notes
•	Don’t log secrets (API keys, tokens). Redact where necessary.
•	Use different transports for production (e.g., Cloud Logging).
Deliverables
•	src/util/logger.js, src/middleware/errorHandler.js, src/models/AuditLog.js.
________________________________________
Puzzle 12 — Tests, Postman collection, and CI
Description
Add unit tests for core models/controllers and a Postman collection to demonstrate end-to-end flows. Wire a basic CI (GitHub Actions) to run tests on push.
Difficulty: Medium–Hard
Tools: Jest, supertest, mongodb-memory-server, Postman, GitHub Actions
Acceptance criteria / Tests
•	Unit tests pass locally and in CI.
•	Postman collection covers: register/login, Google login (manual step), create ticket, post message, AI call, logout.
•	CI runs unit tests on push and fails on test errors.
Pitfalls / Notes
•	Mock external calls (Gemini, Google OAuth) in unit tests; use integration tests sparingly with real providers.
•	Use in-memory MongoDB for CI to avoid DB flakiness.
Deliverables
•	tests/ folder, Postman collection JSON, .github/workflows/test.yml.
________________________________________
Final Checklist & Suggested order to execute (priority)
1.	Puzzle 1 — skeleton & DB connect (required)
2.	Puzzle 2 — User model (foundation)
3.	Puzzle 3 — Local auth + JWT + /me (essential)
4.	Puzzle 4 — Google OAuth (integrate sign-in)
5.	Puzzle 6 — Blacklist & logout (security)
6.	Puzzle 5 — Sessions & refresh (rotating refresh tokens)
7.	Puzzle 7 — Tickets & Messages (core app behavior)
8.	Puzzle 8 — Attachments (files)
9.	Puzzle 9 — Gemini integration (AI features)
10.	Puzzle 10 — Security hardening (rate-limits, helmet)
11.	Puzzle 11 — Logging / error handling / audit logs
12.	Puzzle 12 — Tests & CI
(you can do 6 before 5 if you prefer immediate logout behavior; order is flexible)
________________________________________
Quick testing recipes (how to verify progress)
•	After P1–P3: POST /auth/register, POST /auth/login, GET /auth/me in Postman.
•	After P4: Browser -> /auth/google -> confirm cookie set -> GET /auth/me.
•	After P6: Login -> copy cookie -> POST /auth/logout -> GET /auth/me should fail.
•	After P7–P9: Walk through Postman script: create ticket -> post message -> call /ai/text -> confirm AI message saved.
•	After P8: Upload sample screenshot -> confirm attachment metadata and link present on ticket.
________________________________________
Final notes & best practices (engineer-to-engineer)
•	Keep secrets in environment/config stores (don’t commit). Use Vault/Secrets Manager when deploying.
•	Use migrations or a schema registry if you alter models later.
•	For performance-sensitive parts (blacklist checks, rate-limits, embeddings), move to Redis later.
•	Log structured events (JSON) for easy analysis.
•	Prepare a small Postman README so a client or reviewer can run the full flow manually.

