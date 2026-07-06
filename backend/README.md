# ReqAI Backend (FastAPI + PostgreSQL)

AI-powered requirement decomposition API. Upload a TXT requirements document,
run AI analysis, get back structured Requirements → Tasks → Test Scenarios.

## 1. Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your local PostgreSQL instance, e.g.:

```
DATABASE_URL=postgresql://reqai_user:reqai_pass@localhost:5432/reqai_db
```

Create the database and user first (example using psql):

```sql
CREATE USER reqai_user WITH PASSWORD 'reqai_pass';
CREATE DATABASE reqai_db OWNER reqai_user;
```

Leave `USE_MOCK_AI=true` while you're building/demoing — it fabricates
realistic-looking requirements/tasks/tests without calling OpenAI. Flip it to
`false` and set `OPENAI_API_KEY` once you're ready to use the real AI.

## 3. Run

```bash
uvicorn app.main:app --reload
```

- API root: http://localhost:8000
- Swagger UI (interactive API docs): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Tables are auto-created on startup via `Base.metadata.create_all`. For a
real multi-person team workflow, switch to Alembic migrations (`alembic init
alembic`) instead — ask if you want that scaffolded too.

## 4. Endpoints (Week 1/2 scope)

| Method | Path                          | Purpose                                      |
|--------|-------------------------------|-----------------------------------------------|
| POST   | /api/documents/upload         | Upload a .txt requirement document            |
| POST   | /api/documents/{id}/analyze   | Run AI analysis and persist the results       |
| GET    | /api/documents                | List previously uploaded documents            |
| GET    | /api/documents/{id}           | Get one document's full requirement/task/test tree |

## 5. Project structure

```
app/
  core/config.py       # env-driven settings (DB URL, AI mode, etc.)
  database.py           # SQLAlchemy engine/session
  models/entities.py     # Document, Requirement, Task, TestScenario
  schemas/schemas.py      # Pydantic request/response models
  services/ai_service.py    # Mock + OpenAI analysis implementations
  services/analysis_service.py  # Persists AI output into the DB
  routers/documents.py    # REST endpoints
  main.py                 # FastAPI app entrypoint
```

## 6. Connecting Angular

Add this to your Angular `environment.ts`:

```ts
export const environment = {
  apiUrl: 'http://localhost:8000/api'
};
```

CORS is already configured in `main.py` for `http://localhost:4200`
(Angular's default dev server port).
