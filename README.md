# ReqAI – AI-Powered Requirement Decomposition Platform

ReqAI is an AI-powered requirement engineering assistant that transforms unstructured customer requirement documents (uploaded as `.txt` files) into a structured development backlog consisting of **Business Requirements**, **Development Tasks**, and **Test Scenarios** complete with **Priority Levels** and **Complexity Estimates**.

---

## 🏗️ Project Architecture & Workflow
The platform is built on a modern full-stack architecture:
- **Frontend**: Angular 22, Angular Material, Custom SCSS for a premium glassmorphic UI, RxJS for polling and status updates.
- **Backend**: Python FastAPI, SQLAlchemy ORM, Pydantic data schemas, Uvicorn server.
- **Database**: PostgreSQL (packaged via Docker Compose).
- **AI Service**: Toggleable between a deterministic local Mock AI Service and the OpenAI API (configured in `.env`).

```
📄 Step 1 – Upload Requirement Document (.txt)
      ⬇
📖 Step 2 – Read and extract text in backend
      ⬇
🤖 Step 3 – AI Requirement Analysis (Mock AI or OpenAI)
      ➔ Structured Requirements, Tasks, Test Scenarios, Priorities, Complexities
      ⬇
💾 Step 4 – Store results in PostgreSQL database
      ⬇
🖥️ Step 5 – Display interactive, color-coded dashboard in Angular
```

---

## 🛠️ Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **Frontend**: Angular 22, Angular Material, Custom SCSS
- **Database**: PostgreSQL 15 (Docker)
- **AI Integration**: OpenAI API (GPT-4o-mini) or Local Mock AI Service

---

## 🚀 Running the Application

### 1. Database (PostgreSQL)
Ensure Docker is running, then start the database container:
```bash
docker compose up -d
```
*The database will run on `localhost:5432` with username `reqai_user` and database `reqai_db`.*

### 2. Backend Server (FastAPI)
Navigate to the `backend` folder, activate the virtual environment, and start Uvicorn:
```bash
cd backend
# Activate virtual environment (Windows)
venv\Scripts\activate
# Start FastAPI
uvicorn app.main:app --reload
```
- **API Root**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs` (interactive UI to test APIs)

*Note: You can toggle `USE_MOCK_AI=true/false` and specify your `OPENAI_API_KEY` in the `backend/.env` file.*

### 3. Frontend Application (Angular)
Navigate to the `frontend` folder and start the dev server:
```bash
cd frontend
npm run start
```
- **Local Application URL**: `http://localhost:4200`

---

## 📋 Folder Structure
```
ReqAI/
├── backend/
│   ├── app/
│   │   ├── core/          # Configurations & Settings
│   │   ├── models/        # SQLAlchemy Database Entities
│   │   ├── routers/       # REST Endpoints (Document routes)
│   │   ├── schemas/       # Pydantic schemas (Request/Response validation)
│   │   ├── services/      # AI (Mock/OpenAI) & Analysis database persistence
│   │   └── database.py    # Database session setup
│   ├── uploads/           # Local file storage for audits
│   ├── .env               # Environment configurations
│   ├── requirements.txt   # Python dependencies
│   └── main.py            # App entrypoint
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Dashboard and Document Detail components
│   │   │   ├── models/     # TypeScript Domain interfaces
│   │   │   ├── services/   # DocumentService for API communication
│   │   │   ├── app.routes.ts  # Angular Routing configuration
│   │   │   └── app.ts      # Standalone root component
│   │   ├── styles.scss     # Global styling, themes, animations
│   │   └── index.html      # Main HTML wrapper
│   ├── package.json        # Dependencies & Scripts
│   └── tsconfig.json       # TypeScript configuration
└── docker-compose.yml     # PostgreSQL container configuration
```
