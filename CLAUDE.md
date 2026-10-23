# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

No part of this tree is a git repo (the `.git` folders in both subprojects were removed; the old remotes were `Ularik/cert-admin` for the backend and `Ularik/admin-front` for the frontend). The root holds two independent subprojects plus `users.puml` (PlantUML of who may create tasks for whom). Detailed technical references live in `cert_admin_back/spec_back.md` and `cert_admin_front/spec_front.md`.

- `cert_admin_back/` — FastAPI + async SQLAlchemy + Postgres backend, Celery/Redis for scheduled jobs. Also owns `docker-compose.yml` and `nginx.conf` for the whole stack.
- `cert_admin_front/dashboard/` — Next.js (App Router) + React Query + shadcn/Tailwind v4 frontend. UI text is Russian.

The domain is a task-assignment system: tasks are created for managements/departments, assigned to executors (users), and executors post replies with attached documents. Comments and some commit/migration names are in Russian.

## Backend (`cert_admin_back/`)

Python 3.13. Commands run from `cert_admin_back/` (a `.venv` exists there):

```
pip install -r requirements.txt
uvicorn src.main:app --reload                 # dev server, routes under /api
alembic upgrade head                          # apply migrations (alembic.ini, src/migrations/)
alembic revision --autogenerate -m "msg"      # new migration
python -m src.cli createsuperuser             # interactive ADMIN creation (password >= 12 chars)
celery -A celery_app.celery_app:celery_instance worker --loglevel=INFO
celery -A celery_app.celery_app:celery_instance beat --loglevel=INFO
pytest                                        # needs a reachable Postgres, see below
pytest tests/api_tests/test_auth.py::test_name   # single test
docker compose up --build                     # postgres, redis, backend, celery worker+beat, frontend, nginx
```

Configuration is `src/config.py` (pydantic-settings, reads `.env`; see `.env.example`). `MODE` is `LOCAL | DOCKER | PROD | TEST`; in `DOCKER` mode `POSTGRES_HOST_DOCKER` / `REDIS_HOST_DOCKER` are used instead of the plain hosts.

### Architecture

Layering is router → service → repository, all wired through `DbManager` (`src/db_manager/db_manager.py`):
- `DbManager` is an async context manager that opens one session and exposes every repository as an attribute (`db.users`, `db.tasks`, `db.departments`, …). Routers get it via the `DBDep` dependency; it **rolls back on exit**, so writes must call `await db.save()` to commit. Adding a repository means registering it in `DbManager.__aenter__`.
- `BaseRepository` (`src/repositories/base.py`) is generic over `model` + `schema` and returns Pydantic schemas, not ORM objects. It translates asyncpg unique/FK violations into `UniqueObjIsExistException` / `ObjectNotFoundException`; `src/exceptions/exception_handlers.py` maps those to HTTP errors.
- Services (`src/services/`) take a `DbManager` and hold business rules (e.g. `BaseService.get_user_management_id`).

Auth and roles (`src/routers/dependencies.py`): JWT in the `access_token` **cookie** (not an Authorization header). `UserStatus` roles are `ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD, HEAD, DEPUTY, USER`. `src/routers/api.py` mounts everything under `/api` with role gates per prefix:
- `/api/admin` → ADMIN, DIVISION_HEAD
- `/api/head` → ADMIN, DIVISION_HEAD, HEAD, DEPUTY
- `/api/management-head` → MANAGEMENT_HEAD only; it reuses the admin departments/users routers and head task-write router, plus its own task-read router
- shared `/api/tasks`, `/api/users`, replies, departments, managements — `/api/tasks` is **forbidden to MANAGEMENT_HEAD** (they must use their own prefix)

Task-creation scoping rules are documented in `users.puml`: executors must belong to the task's department; HEAD/DEPUTY/USER are limited to their own department, MANAGEMENT_HEAD to their own management.

Celery: `celery_app/tasks.py` has `tasks.set_expired_tasks`, run daily at 00:00 by beat, which marks overdue tasks expired. It uses `AsyncSessionNullPool` (not the shared engine) because it calls `asyncio.run` per invocation.

Timestamps use the Postgres `Asia/Bishkek` timezone via `server_default`. Migrations live in `src/migrations/versions/`.

### Tests

`tests/` are async API tests (`httpx.AsyncClient` + `ASGITransport`, `asyncio_mode = auto`). `pytest.ini` loads `.env_test`, and `conftest.py` asserts `MODE == "TEST"`, **drops and recreates the `public` schema** at session start/end, and truncates all tables before each test — never point `.env_test` at a database you care about. Fixtures: `ac` (client), `admin_ac` (client logged in as admin via cookie), `test_user`, `test_department`. `.github/agents/api-test-writer.agent.md` describes conventions for adding API tests (test only via cookies, check DB side effects, don't modify `src/`).

## Frontend (`cert_admin_front/dashboard/`)

Commands run from `cert_admin_front/dashboard/`: `npm run dev`, `npm run build`, `npm run lint`. There is no test runner configured. `output: "standalone"` is set for the Docker image.

`AGENTS.md` (imported by the local `CLAUDE.md`) warns that this Next.js (16.x) and React 19 have breaking changes from older versions: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code.

### Architecture

- **Routing by role**: `app/(roles)/{admin,management-head,heads,users}/…` — one route tree per role, each with `tasks`, `tasks/[id]`, `tasks/[id]/reply/…`, and (where applicable) `departments`, `executors`, `managements`. `app/(roles)/layout.tsx` wraps everything in `middlewares/ProtectedLayout.tsx`, a **client-side** guard that calls `useMe()` and redirects by role using `roleDashboardPaths` in `constants/main.ts`. That file also defines the sidebar menu per role (`dashboardMenuItems`). Role names mirror the backend `UserStatus` enum; keep them in sync.
- **Data layer**: `services/requests/*` are plain axios functions; `services/queries/*` wrap them in React Query hooks (query keys like `["tasks", tasksPath, params]`; mutations invalidate `["tasks"]` / `["task"]`). Role-specific variants live in subfolders (`admin/`, `heads/`, `management-head/`). Hooks such as `useTasks` / `useTaskDetail` take a `tasksPath` argument so the same component can hit `/tasks`, `/head/tasks`, `/admin/tasks` or `/management-head/tasks` depending on role.
- **Shared components** in `components/` are role-agnostic and are parameterized by path/props; role pages in `app/` mostly compose them. `components/ui/` is shadcn (`components.json`); import alias is `@/*` → project root.
- **HTTP**: `lib/axiosApi.ts` uses `withCredentials` for the cookie auth. Base URL is `/api` in the browser (relying on nginx to proxy `/api` to the backend; `next.config.ts` has no rewrites) and `${NEXT_BACK_URL}/api` during SSR. On a 401 it calls `/users/logout` and redirects to `/login`. Note `docker-compose.yml` sets `NEXT_API_URL`, while the code reads `NEXT_BACK_URL` — check both when touching env config.
- Backend CORS only allows `http://localhost:3000` (`src/main.py`).
