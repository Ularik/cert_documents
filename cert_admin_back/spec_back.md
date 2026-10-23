# spec_back.md — техническая спецификация бэкенда (cert_admin_back)

Справочник по бэкенду системы постановки и контроля задач. Составлен по исходникам; при расхождении с кодом прав код. Раздел «Известные особенности и риски» в конце — фактические наблюдения, ничего из них не исправлено.

## 1. Стек и запуск

- Python 3.13, FastAPI (`fastapi[standard]`), SQLAlchemy 2 async + asyncpg, Alembic, Pydantic v2 / pydantic-settings, PyJWT, bcrypt, Celery + Redis, python-docx (в requirements, в коде не используется), pytest + pytest-asyncio + pytest-dotenv.
- Точка входа: `src/main.py` (`app = FastAPI(lifespan=...)`). Lifespan вызывает `setup_logging()`. Все роуты под префиксом `/api`. CORS: только `http://localhost:3000`, `allow_credentials=True`.
- Логи: stdout; в режимах `PROD`/`DOCKER` формат JSON-строкой, иначе текстовый. Уровень INFO.

Команды (из `cert_admin_back/`):

```
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
alembic upgrade head
alembic revision --autogenerate -m "msg"
python -m src.cli createsuperuser          # ADMIN, пароль >= 12 символов
celery -A celery_app.celery_app:celery_instance worker --loglevel=INFO
celery -A celery_app.celery_app:celery_instance beat --loglevel=INFO
pytest                                      # нужен Postgres из .env_test
pytest tests/api_tests/test_auth.py::имя_теста
docker compose up --build
```

### Конфигурация (`src/config.py`; файл `../.env_back` в корне проекта, шаблон `../.env_back.example`)

`Settings` читает `cert_admin_back/.env` (если есть) и затем `../.env_back`; в Docker переменные приходят через `env_file: ./.env_back`. Файл в git не хранится. Для локального запуска вне Docker поставьте в нём `MODE=LOCAL`.

| Переменная | Назначение |
|---|---|
| `MODE` | `LOCAL` / `DOCKER` / `PROD` / `TEST` |
| `POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT` | параметры БД |
| `POSTGRES_HOST`, `POSTGRES_HOST_DOCKER` | хост; при `MODE=DOCKER` берётся `*_DOCKER` |
| `REDIS_HOST`, `REDIS_HOST_DOCKER`, `REDIS_PORT` | брокер Celery; `REDIS_URL = redis://host:port` |
| `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT |

`Settings.DB_URL = postgresql+asyncpg://user:pass@host:port/db`. `.env_test` подключается через `pytest.ini` (`env_files`).

### Docker (`../docker-compose.yml`, в корне проекта)

Запуск: `docker compose up --build` из корня. Нужны `.env_back` и `.env_front` в корне (шаблоны `*.example`, `MODE=DOCKER`). Порты nginx задаются `HTTP_PORT` / `HTTPS_PORT` (по умолчанию 80 / 443). Первый админ: `docker compose exec backend python -m src.cli createsuperuser`. `container_name` не заданы (имена вида `<проект>-<сервис>-1`), чтобы не конфликтовать с другими стеками.

Сервисы: `postgres` (17-alpine, том `postgres_data_admin`, без проброса порта, healthcheck `pg_isready`; backend/celery_worker стартуют после `service_healthy`), `redis` (7.2, appendonly, healthcheck), `backend` (`alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000`, порт 8000), `celery_worker`, `celery_beat`, `frontend` (build из `cert_admin_front`, `env_file cert_admin_front/dashboard/.env`), `nginx` (конфиг `./nginx.conf` (корень проекта) монтируется как `default.conf`; добавлен `client_max_body_size 100m` для загрузки вложений). Dockerfile: `python:3.13.5-slim-bullseye`, WORKDIR `/home`, создаёт `/usr/www/logs` и `/usr/www/media`, CMD не задан (команды в compose).

`../nginx.conf` (корень проекта; upstream'ы заданы через `resolver 127.0.0.11` и переменные `set $…_upstream`, поэтому nginx стартует, даже если backend/frontend ещё не подняты — до их появления отдаёт 502, а не падает с «host not found in upstream»): `location = /api` и `location /api/` → `http://backend:8000`; `location /` → `http://frontend:3000` (с upgrade-заголовками). TLS в конфиге не настроен (только `listen 80`, порт 443 проброшен).

## 2. Структура кода

```
src/
  main.py            приложение, CORS, обработчики исключений
  config.py          Settings
  database.py        engines, session makers, Base
  cli.py             createsuperuser
  db_manager/        DbManager (unit of work)
  models/            ORM-модели
  schemas/           Pydantic-схемы
  repositories/      доступ к данным (BaseRepository + специализированные)
  services/          бизнес-логика и проверки прав
  routers/           HTTP; dependencies.py — DI и ролевые гейты
  exceptions/        доменные исключения + их HTTP-обработчики
  utils/documents.py prepare_files_and_insert (сейчас нигде не используется)
  migrations/        Alembic (versions/ — 20+ ревизий, часть имён на русском)
celery_app/          celery_app.py (инстанс + beat), tasks.py
tests/               api_tests/ + conftest.py
```

### database.py

- `engine` (в `TEST` — `NullPool`), `engine_null_pool` (всегда `NullPool`), `AsyncSessionMaker` (на `engine`), `AsyncSessionNullPool` (на `engine_null_pool`; используется в Celery и в тестовых фикстурах), `expire_on_commit=False`. `Base(DeclarativeBase)`.

### DbManager

`async with DbManager(session_factory) as db` создаёт одну сессию и репозитории: `users, departments, managements, tasks, tasks_documents, tasks_users, reply_tasks, reply_documents, task_departments`. На `__aexit__` всегда `rollback()` и `close()` — **коммит только явным `await db.save()`**. Роутеры получают его через `DBDep` (`get_db`). Новый репозиторий нужно зарегистрировать в `__aenter__`.

### Слои

Роутер → сервис (`BaseService(db)`) → репозиторий. Репозитории возвращают Pydantic-схемы (`schema.model_validate`), не ORM-объекты. Исключения репозиториев: `ObjectNotFoundException`, `UniqueObjIsExistException` (из asyncpg `ForeignKeyViolationError` / `UniqueViolationError`).

`BaseRepository` (`repositories/base.py`): `get_filtered_objects(*filters, **filters_by)` (поддерживает `limit`/`offset` в kwargs), `get_objects`, `get_one_or_none`, `get_one` (→ `ObjectNotFoundException`), `add_obj` (INSERT … RETURNING, `exclude_unset`), `edit(data, exclude_unset=True, **filters)` (UPDATE … RETURNING; `scalar_one`), `delete`, `check_exist_delete`, `add_bulk(items, conflict_columns=None)` (pg insert, `on_conflict_do_nothing`), `edit_bulk`, `delete_bulk(*filters, **filters_by)`. В `add_bulk`, `delete_bulk` и `TasksRepository.get_filtered_tasks` остались `print()` скомпилированного SQL.

## 3. Модель данных

Все `created_at`/`updated_at` — `DateTime(timezone=True)` с `server_default = timezone('Asia/Bishkek', now())`, `updated_at` ещё и `onupdate`.

**users**: `id`, `username` (≤50), `last_name` (≤50, nullable), `hashed_password` (bytes), `status` (Enum `UserStatus`, default `USER`), `department_id` → departments (SET NULL), `management_id` → managements (SET NULL). `UNIQUE(username, last_name)` (`uq_users_username_last_name`). Связи: `tasks` (M2M через users_tasks), `department`, `management`, `replies`.

`UserStatus`: `ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD, HEAD, DEPUTY, USER`.
Константы: `ADMIN_ACCESS_STATUSES = {ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD}`; `MANAGEMENT_SCOPED_STATUSES = {MANAGEMENT_HEAD, USER}`.

**managements**: `id`, `title` (≤100, UNIQUE), `description`, `departments`, `users`, `head` (viewonly: пользователь со `status=MANAGEMENT_HEAD` и этим `management_id`).

**departments**: `id`, `title` (≤100), `description`, `management_id` → managements (RESTRICT, NOT NULL). `UNIQUE(management_id, title)`. Связи: `management`, `users`, `head` (viewonly, `status=HEAD`), `deputy_head` (viewonly, `status=DEPUTY`), `tasks` (M2M).

**tasks**: `id`, `author_id` → users (SET NULL), `management_id` → managements (RESTRICT, NOT NULL), `title` (≤255, **глобально UNIQUE**), `description`, `deadlines` (date), `is_expired` (bool, null), `status` (`TasksStatus`: NEW/PROGRESS/DONE, default NEW), `note`. Связи: `author`, `management`, `departments` (M2M departments_tasks), `executors` (M2M users_tasks), `attachments` (TaskDocuments, cascade delete-orphan), `replies` (TaskReply, cascade delete-orphan).

**users_tasks** (`id`, `user_id` CASCADE, `task_id` CASCADE, UNIQUE(user_id, task_id)) и **departments_tasks** (`department_id` CASCADE, `task_id` CASCADE, UNIQUE(department_id, task_id)).

**task_documents**: `id`, `filename` (≤255), `mime_type` (≤100), `file_data` (LargeBinary, **deferred** — грузится только через `undefer`), `task_id` CASCADE. **task_replies**: `id`, `content`, `created_at`, `task_id` CASCADE, `author_id` → users (CASCADE). **reply_documents**: как task_documents, `reply_id` CASCADE.

Файлы хранятся в БД как bytea (диск не используется).

Миграции: `src/migrations/versions/`, формат имени `YYYY_MM_DD_HHMM-<rev>_<slug>.py`. Историческая цепочка: user/department → задачи → начальники/заместители → many-to-many отделы-задачи → ответы → статусы/сроки/просрочка/note → (2026-10-20) роли управлений, таблица managements, `management_id` у задач, уникальность отделов по управлению и пользователей по (username, last_name).

## 4. Аутентификация и авторизация

- Логин `POST /api/users/login` по `username + last_name + password` → JWT (`{user_id, status, exp}`) кладётся в cookie `access_token` (`secure=False`, без `httponly`/`samesite`; значение дублируется в теле ответа `{"access_token": ...}`). Хеш пароля bcrypt, вычисления в `ThreadPoolExecutor(max_workers=4)`.
- `get_token` читает **только cookie** (нет заголовка Authorization) → 401 «Вы не передали токен…». `AuthService.decode_token` → 401 при истёкшем/некорректном токене.
- Роль берётся **из токена** (`UserInCookiesSchema.status`) для роутерных гейтов; сервисы дополнительно читают актуального пользователя из БД (`db.users.get_one(id=...)`) и проверяют права по нему. Смена роли в БД не отзывает уже выданный токен (гейты по префиксу продолжат смотреть на старую роль до перелогина).
- Гейты (`routers/dependencies.py`):
  - `get_admin_user`: ADMIN, DIVISION_HEAD
  - `get_head_user`: ADMIN, DIVISION_HEAD, HEAD, DEPUTY
  - `get_management_head_user`: MANAGEMENT_HEAD
  - `get_general_task_user`: любой, кроме MANAGEMENT_HEAD (403 «Используйте отдельный маршрут начальника управления»)
  - `AuthUserDep`: любой аутентифицированный
- Роли: ADMIN и DIVISION_HEAD — полный доступ ко всем управлениям; MANAGEMENT_HEAD — своё управление; HEAD/DEPUTY — свой отдел; USER — рядовой сотрудник. «Управленческая область» (`MANAGEMENT_SCOPED_STATUSES` = MANAGEMENT_HEAD и USER) ограничивает видимость сущностей чужого управления (404). Управление пользователя определяется `BaseService.get_user_management_id`: `user.management_id`, иначе управление его отдела.

PlantUML `../users.puml` описывает правила создания задач: ADMIN/DIVISION_HEAD — любые отделы одного выбранного управления; MANAGEMENT_HEAD — своё управление; HEAD/DEPUTY/USER — только свой отдел; исполнители обязаны состоять в отделах задачи.

## 5. HTTP API

Все пути с префиксом `/api`. Нормативные тела — форма (`multipart/form-data`) для задач и ответов, JSON для остального.

### 5.1 Общие (любой аутентифицированный, если не указано иное)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/users/login` | вход (**без** аутентификации) |
| POST | `/users/` | регистрация пользователя, `UsersAuthSchema` (**без** аутентификации, см. риски) |
| POST | `/users/logout` | удаляет cookie |
| GET | `/users/` | список (`department_id?`); для MANAGEMENT_SCOPED — только своё управление |
| GET | `/users/roles` | список ролей (строки enum) |
| GET | `/users/me` | текущий пользователь |
| GET | `/users/{id}` | пользователь (чужое управление → 404 для scoped) |
| GET | `/departments/`, `/departments/{id}` | отделы с `head`/`deputy_head` (scoped видят только своё управление) |
| GET | `/managements/`, `/managements/{id}` | управления с `head` и `departments` |
| GET | `/tasks/{id}/tasks_reply` | ответы задачи |
| GET | `/tasks/tasks_reply/{id}` | один ответ |
| GET | `/tasks/tasks_reply/{doc_id}/download` | скачать файл ответа |
| POST | `/tasks/{id}/tasks_reply` | создать ответ: form `content`, `attachments[]` |
| PUT | `/tasks/tasks_reply/{id}` | form `content`, `attachments[]`, `old_attachments_ids[]` |
| DELETE | `/tasks/tasks_reply/{id}` | удалить ответ |

Замечание по порядку маршрутов: `GET /tasks/tasks_reply/{doc_id}/download` объявлен раньше `GET /tasks/tasks_reply/{id}`; в роутере задач `GET /tasks/task-documents/{doc_id}/download` объявлен раньше `GET /tasks/{id}`.

### 5.2 Задачи, `/tasks` (все, кроме MANAGEMENT_HEAD; гейт `get_general_task_user`)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/tasks/` | список с фильтрами (ниже), ответ `{total, items: TaskFullOutSchema[]}` |
| GET | `/tasks/{id}` | детали |
| POST | `/tasks/` | создать (form, ниже) |
| PUT | `/tasks/{id}` | обновить (form + `old_attachments_ids[]`) |
| PATCH | `/tasks/{id}` | `{"status": "NEW"|"PROGRESS"|"DONE"}` |
| DELETE | `/tasks/{id}` | удалить: только админский доступ или автор |
| GET | `/tasks/task-documents/{doc_id}/download` | скачать вложение (Content-Disposition `filename*=UTF-8''…`) |

Form-поля создания/обновления: `title` (обязательно), `description`, `deadlines` (date), `note`, `management_id`, `departments_ids[]`, `executor_ids[]`, `attachments[]`.

Query-параметры списка (`QueryParamsSchema`): `department_id`, `management_id`, `created_at`, `from_date`, `to_date`, `status` (повторяющийся; NEW/PROGRESS/DONE), `rush`, `extra_rush`, `is_expired`, `limit` (1..50, по умолчанию 10), `offset` (≥0). Сортировка `created_at desc`.
Семантика (`TasksRepository.get_filtered_tasks`): `from_date` → `created_at >= from_date`; `to_date` → `created_at < to_date + 1 день`; `rush` (передан любым значением, в т.ч. `false`) → срок в ближайшие 3 дня **или** просрочена и не DONE; `extra_rush` → срок завтра **или** просрочена и не DONE; `is_expired` (аналогично, любое значение) → не DONE и срок < сегодня, **или** флаг `is_expired`. Фильтры включаются по факту `is not None`, значение булева не инвертирует условие.

### 5.3 Админ, `/admin/*` (ADMIN, DIVISION_HEAD)

- `POST /admin/departments/`, `PUT /admin/departments/{id}`, `DELETE /admin/departments/{id}` (204). Тело `DepartmentRequestCreateUpdateSchema`: `title`, `description`, `management_id`, `head_id`, `deputy_head_id` (head ≠ deputy).
- `POST /admin/managements/`, `PUT /admin/managements/{id}`, `DELETE /admin/managements/{id}` (204). Тело `ManagementRequestSchema`: `title`, `description`, `head_id`. (В коде есть проверки на MANAGEMENT_HEAD, но гейт префикса его и так не пускает.)
- `POST /admin/users/` (`UsersAuthSchema`), `PATCH /admin/users/{id}` (`UserUpdateSchema`), `DELETE /admin/users/{id}`.
- `POST|PUT|PATCH|DELETE /admin/tasks[/{id}]` — те же поля, что у `/tasks`; удаление через `delete_task_by_admin` (без проверки автора).

### 5.4 Руководители отделов, `/head/*` (ADMIN, DIVISION_HEAD, HEAD, DEPUTY)

- `POST /head/departments/` (и без слэша) — создание отдела (допустимые роли в сервисе: ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD, HEAD).
- `POST /head/users/` — `create_managed_user`; `PATCH /head/users/{id}`, `DELETE /head/users/{id}` — **без** `actor_id` и без проверки области (см. риски).
- `POST|PUT|PATCH|DELETE /head/tasks[/{id}]` — `delete_task_by_head`. В PUT поле списка старых вложений называется `old_attachments_datas` (а не `old_attachments_ids` как у остальных).

### 5.5 Начальник управления, `/management-head/*` (только MANAGEMENT_HEAD)

Собирается в `management_head/main.py` из: `head/tasks` (запись задач — POST/PUT/PATCH/DELETE), `management_head/tasks` (чтение: `GET /tasks/`, `GET /tasks/{id}`, `GET /tasks/task-documents/{doc_id}/download`), `admin/departments` (CRUD отделов), `admin/users` (создание/правка/удаление пользователей). Управления (`/admin/managements`) недоступны. Ограничение «только своё управление» обеспечивается сервисами.

## 6. Бизнес-правила (сервисы)

### Пользователи (`UserService`)
- `login_user`: ищет по (username, last_name); 401 «Пользователь не найден» / «Неверный пароль!».
- `create_user`: хеширует пароль, `UniqueObjIsExistException` → 409.
- `create_managed_user(data, actor_id)`: допустимые для назначения роли — ADMIN/DIVISION_HEAD: DIVISION_HEAD, MANAGEMENT_HEAD, HEAD, DEPUTY, USER; MANAGEMENT_HEAD: HEAD, DEPUTY, USER; HEAD: DEPUTY, USER; DEPUTY: USER (иначе 403). Для `MANAGEMENT_HEAD` обязателен `management_id` существующего управления; для остальных `management_id` указывать нельзя (422), он выводится из отдела; HEAD/DEPUTY требуют отдел. HEAD/DEPUTY-актор может добавлять только в свой отдел; MANAGEMENT_HEAD — только в отделы своего управления (`department_id` обязателен).
- `update_admin_user` (используется `/admin/users` и `/management-head/users`): нормализует (status, department_id, management_id) по целевой роли: ADMIN → оба null; MANAGEMENT_HEAD → отдел запрещён, управление обязательно и без другого начальника (409); HEAD/DEPUTY → отдел и управление обязательны, отдел должен принадлежать управлению, место не должно быть занято (409); USER → при смене роли нужны управление и отдел; DIVISION_HEAD → отдел null. При смене роли без явных значений department/management сбрасываются в null. MANAGEMENT_HEAD-актор: не правит себя, цель в своём управлении (иначе 404), может назначать только USER/HEAD/DEPUTY, итоговое управление = своё.
- `delete_user`: MANAGEMENT_HEAD-актор не удаляет себя, не удаляет MANAGEMENT_HEAD и сотрудников чужих управлений (404).
- `get_users`: для scoped-ролей фильтр по управлению (по `users.management_id` или отделам управления); возвращает `UserWithDepartmentOut` с `department_title`.

### Отделы (`DepartmentService`)
- Создание/правка: HEAD и DEPUTY отдела назначаются через `head_id`/`deputy_head_id` — пользователю выставляются `status` и `department_id`. При правке прежние руководители, не вошедшие в новый набор, понижаются до `USER`. MANAGEMENT_HEAD действует только в своём управлении и может назначать руководителями только сотрудников своего управления (и не себя). Дубликат (management_id, title) → 409.
- Удаление: доступно ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD (свой). Руководители отдела понижаются до `USER`; FK пользователей `SET NULL`.

### Управления (`ManagementService`)
- Создание/правка с `head_id`: назначает `MANAGEMENT_HEAD` + `management_id`; смена начальника понижает прежнего до `USER` и обнуляет его `management_id`. Дубликат title → 409. Удаление запрещено, пока есть отделы (409); начальник понижается до `USER`.

### Задачи (`TasksService`)
- `create_task`: актор без админского доступа (`ADMIN_ACCESS_STATUSES`) обязан иметь отдел (`DependsDepartmentException`) и его `departments_ids` принудительно = `[user.department_id]`. `_validate_task_targets`: все отделы существуют; управление определяется из `management_id`/fallback/`actor.management_id`/единственного управления отделов, иначе 400; управление существует (404); MANAGEMENT_HEAD — только своё (403); все отделы из одного управления (400); исполнители существуют и состоят в выбранных отделах (400). Дубликат `title` → `TaskAlreadyExistException` (400). Вложения: дубли по `filename` пропускаются.
- `update_task`: MANAGEMENT_HEAD — только задачи своего управления; без админского доступа — только задачи, привязанные ровно к его отделу. `author_id` перезаписывается актором (в `TaskCreateUpdateSchema`). Исполнители синхронизируются (`set_user_task`), отделы синхронизируются (`connect_departments_to_task`: upsert + удаление не вошедших), вложения: оставляются только `old_attachments_ids`, остальные удаляются, новые добавляются.
- `change_status`: MANAGEMENT_HEAD — своё управление; админские — любой; остальные — только если у них совпадает отдел с одним из отделов задачи (`same_department`). Статус также автоматически становится `PROGRESS` при создании ответа.
- `get_tasks` / `get_one`: scoped-роли ограничены своим управлением (иное `management_id` в запросе → `HasNotRightsToTaskException` 403; чужая задача в `get_one` → 404).
- Удаления: `delete_task` — админский доступ или автор (MANAGEMENT_HEAD — своё управление); `delete_task_by_head` — MANAGEMENT_HEAD своё управление, иначе отделы задачи должны быть ровно `[user.department_id]`; `delete_task_by_admin` — любой, кроме MANAGEMENT_HEAD чужого управления.

### Ответы и документы
- `ReplyService`: для scoped-ролей задача должна быть в их управлении (иначе 404). `create_reply` ставит статус задачи `PROGRESS`, добавляет автора в исполнители, если его там нет, сохраняет вложения. `update_reply`/`delete_reply` проверяют только область управления, **не авторство**.
- `DocumentService`: скачивание проверяет область управления через `task_id` документа; отсутствие документа → 404.

### Исключения (`exceptions/`)
`NoResultException`-ветка → 404 (`Department/Task/Reply/UserNotFound`, `ObjectNotFound`), `HasNotRightsToTaskException` → 403, `TaskAlreadyExistException` и `UserAlreadyExistException` → 400, `DepartmentAlreadyExistException` → 409 (JSONResponse). Прочие `HasNotRightsException` (`DependsDepartmentException`, `HasNoRightsToUpdateDepartment`) и `TaskNotFoundException` отдельных обработчиков не имеют (`TaskNotFoundException` наследует `ObjectNotFoundException` → `NoResultException` → 404; ветка `HasNotRightsException` без обработчика → 500). Сообщения на русском.

## 7. Celery

`celery_app/celery_app.py`: `Celery("celery_app", broker=settings.REDIS_URL, backend="rpc://")`, `include=['celery_app.tasks']`. Beat: `set-expired-tasks-every-5-minutes` (название устарело) → задача `tasks.set_expired_tasks`, расписание `crontab(minute=0, hour=0)` — раз в сутки в 00:00 (вариант «каждую минуту» закомментирован). Задача: `asyncio.run(...)` → `db.tasks.set_expired_status()` (`is_expired=True` для не-DONE с `deadlines < today`) через `AsyncSessionNullPool`. Файл `celerybeat-schedule` лежит в репозитории.

## 8. Тесты

- `pytest.ini`: `pythonpath = . src`, `env_files = .env_test`, `asyncio_mode = auto`.
- `conftest.py`: сессионные autouse-фикстуры `check_mode` (assert `MODE == "TEST"`) и `setup_database_schema` (**`DROP SCHEMA public CASCADE`**, создание таблиц из `Base.metadata`, после сессии снова drop); функциональная autouse `setup_database` (`TRUNCATE ... RESTART IDENTITY CASCADE` по всем таблицам). Фикстуры: `ac` (httpx `AsyncClient` + `ASGITransport`), `admin_ac` (создаёт ADMIN через `POST /api/users/` и логинится, cookie остаётся в клиенте), `test_user`, `test_department` (создаёт управление + отдел через админские ручки).
- Файлы: `tests/api_tests/test_admin_routes.py, test_auth.py, test_departments.py, test_managements.py`.
- Соглашения для новых тестов — `.github/agents/api-test-writer.agent.md` (только `tests/`, проверять тело ответа и состояние БД, авторизация через cookie `access_token`, multipart через `data=`/`files=`).

## 9. Известные особенности и риски (наблюдения, не исправлены)

1. `POST /api/users/` открыт без аутентификации и принимает `status` (в т.ч. `ADMIN`), `department_id`, `management_id` — любой может создать администратора. Тесты (`admin_ac`) на это опираются.
2. `/api/head/users` `PATCH` и `DELETE` вызывают `UserService.update_user` / `delete_user` без `actor_id` и без проверок области — HEAD/DEPUTY может менять/удалять любого пользователя. `UserUpdateSchema` допускает смену `status`.
3. `PUT /head/tasks/{id}` читает старые вложения из поля `old_attachments_datas`, а фронтенд шлёт `old_attachments_ids` → при правке задачи руководителем все существующие вложения удаляются.
4. Cookie токена не `httponly`, `secure=False`; `SECRET_KEY` берётся из env; CORS жёстко на `localhost:3000`.
5. `QueryParamsSchema.status` объявлен как `Field(default_factory=[])` (не callable); работает только потому, что `get_query_params` всегда передаёт значение явно.
6. `routers/dependencies.py` содержит случайный импорт `from pygments.lexer import default` (зависимость pygments не в requirements).
7. `rush`/`extra_rush`/`is_expired` фильтры включаются при любом переданном значении (включая `false`).
8. `update_reply`/`delete_reply` не проверяют, что актор — автор ответа; `create_reply` не проверяет принадлежность актора отделу задачи (только область управления для scoped-ролей).
9. `PUT /tasks/{id}` для не-админских ролей проверяет, что задача привязана ровно к одному отделу актора; при отсутствии отдела — 403.
10. `delete`-ручки возвращают `return 200, {...}` (кортеж, а не статус) — тело ответа будет JSON-массивом.
11. Токен хранит роль на момент логина; `JWT exp` по `ACCESS_TOKEN_EXPIRE_MINUTES`, refresh-механизма нет.
12. Файлы хранятся в БД (bytea), ограничений на размер/тип в коде нет.
