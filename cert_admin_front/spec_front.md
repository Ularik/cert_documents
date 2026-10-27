# spec_front.md — техническая спецификация фронтенда (cert_admin_front)

Справочник по фронтенду (панель управления задачами). Составлен по исходникам; при расхождении с кодом прав код. Все пути ниже относительно `cert_admin_front/dashboard/`, если не указано иное. Интерфейс на русском. Бэкенд описан в `../cert_admin_back/spec_back.md`.

## 1. Стек и запуск

- Next.js **16.3.1** (App Router, `output: "standalone"`), React **19.2.8**, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`, `tw-animate-css`), shadcn (стиль `base-vega`, `@base-ui/react`, иконки `lucide-react`, `cmdk`, `sonner`, `next-themes`), TanStack React Query 5 (+ devtools), react-hook-form 7 (+ `@hookform/resolvers`), axios, clsx / tailwind-merge / class-variance-authority.
- `AGENTS.md` (импортируется из `CLAUDE.md`): эта версия Next.js имеет ломающие изменения — перед написанием Next-специфичного кода читать `node_modules/next/dist/docs/`.
- Скрипты (`package.json`): `npm run dev`, `npm run build`, `npm run start`, `npm run lint` (ESLint 9, `eslint-config-next` core-web-vitals + typescript). Тестового раннера нет.
- Алиас импортов `@/*` → корень `dashboard/` (`tsconfig.json`). `components.json`: алиасы `@/components`, `@/lib/utils`, `@/components/ui`, `@/hooks`; RSC включён.
- Шрифты: Montserrat (latin+cyrillic, `--font-montserrat`) и Inter (`--font-sans`) в `app/layout.tsx`. Заголовок страницы «Cert Dashboard».

### Окружение (`../.env_front` в корне проекта, шаблон `../.env_front.example`; в git не хранится)

Переменные: `MODE`, `NEXT_BACK_URL`, `NEXT_BACK_URL_LOCAL` (серверные, читаются в рантайме) и опциональная `NEXT_PUBLIC_API_URL` (браузер, для `npm run dev` без nginx; по умолчанию `/api`) (значения не дублируются здесь). В коде реально читается `NEXT_BACK_URL`:
- `lib/axiosApi.ts` — SSR-базовый URL `${NEXT_BACK_URL}/api` (`NEXT_BACK_URL_LOCAL` при `MODE=LOCAL`); в браузере `NEXT_PUBLIC_API_URL` или `/api`;
- `app/layout.tsx` — favicon `${NEXT_BACK_URL}/logo/logo.png`.

Compose (`../docker-compose.yml` в корне) передаёт контейнеру frontend только `env_file ./.env_front`; там `NEXT_BACK_URL=http://backend:8000` (имя сервиса compose).

### Docker (`../Dockerfile`)

Три стадии на `node:20-alpine`: `deps` (`npm ci`) → `builder` (`npm run build`, `NEXT_TELEMETRY_DISABLED=1`) → `runner` (копирует `.next/standalone` и `.next/static`, пользователь `nextjs`, `PORT=3000`, `HOSTNAME=0.0.0.0`, `node server.js`). Контекст сборки — `cert_admin_front/`, сорцы берутся из `dashboard/`. Фронт работает за nginx бэкенд-стека (`/` → frontend:3000, `/api` → backend:8000).

## 2. Структура

Архитектура — Feature-Sliced Design: код в `src/`, импорты только вниз по слоям, межслайсовые — через `index.ts` (правило `eslint-plugin-boundaries` в `eslint.config.mjs`, уровень error; импорт между сущностями разрешён только через `@x`, напр. `@/entities/user/@x/task`). Алиас `@/*` → `src/*`.

```
app/                    тонкие файлы Next: page.tsx = re-export из src/pages/<slug>, layout.tsx (корневой — шрифты, Toaster, Providers)
pages/README.md         пустая заглушка, чтобы Next не принял src/pages за Pages Router
src/
  app/                  providers/ (QueryClientProvider), guards/ProtectedLayout, layouts/ (RolesLayout, ManagementHeadLayout), styles/globals.css
  pages/<slug>/         экран = один маршрут (admin-tasks, users-tasks-id-reply-new, login ...), ui/Page.tsx + index.ts
  widgets/              sidebar (+model/menu.ts), header, task-list, task-detail, rush-tasks, task-status-counters,
                        executors-view, executor-detail, managements-view, reply-detail,
                        employee-task-stats (таблица статистики задач по сотрудникам + EmployeeTasksHistory: выбор сотрудника через поиск и его задачи с пагинацией и фильтром по дате создания, query executor_id + EmployeeTasksHistory: выбор сотрудника через поиск и его задачи с пагинацией и фильтром по дате создания; query `executor_id` на дашбордах админа и начальника управления; GET {usersPath}/tasks-stats, хук useUsersTasksStats; MyTaskStats — личные счётчики через useMyTasksStats, GET /users/me/tasks-stats; на дашбордах heads и users; таблица сотрудников отдела у HEAD/DEPUTY — usersPath="/head/users")
                        task-list/MyTasksList (раздел «Мои задачи»: /heads/tasks/my и /users/tasks/my, useTasks с executor_id = id текущего пользователя; пункт меню «Мои задачи» у HEAD, DEPUTY, USER)
  features/             auth, create-task, update-task, change-task-status, task-scope-toggle, reply-create/edit/list,
                        executor-add, department-form, management-form
  entities/             task, reply, user (роли в model/roles.ts), department, management, document
                        — api/ (axios), model/ (типы + React Query хуки; admin.ts/heads.ts/management-head.ts — роль-варианты), ui/
  shared/               ui/ (shadcn + pagination), api/axiosApi.ts, lib/utils.ts, types/main.ts
```

Старые пути → новые: `components/ui` → `shared/ui`; `lib/axiosApi` → `shared/api/axiosApi`; `services/requests|queries` → `entities/*/api|model`; `types/*` → `entities/*/model/types.ts`; `constants/main.ts` → `entities/user/model/roles.ts` + `widgets/sidebar/model/menu.ts`; `middlewares`, `providers` → `src/app`.

### Дерево маршрутов (`app/(roles)`)

| Роль | Корень | Страницы |
|---|---|---|
| ADMIN / DIVISION_HEAD | `/admin` | `departments` (+`new`, `[id]`), `managements` (+`new`, `[id]`), `executors` (+`new`, `[id]`), `tasks` (+`new`, `[id]`, `[id]/reply`, `[id]/reply/new`, `[id]/reply/[reply_id]`) |
| MANAGEMENT_HEAD | `/management-head` | `departments` (+`new`, `[id]`), `executors` (+`new`, `[id]`), `tasks` (+`new`, `[id]`, `[id]/reply[...]`) |
| HEAD / DEPUTY | `/heads` | `executors` (+`new`, `[id]`), `myexecutors`, `tasks` (+`all`, `new`, `[id]`, `[id]/reply[...]`) |
| USER | `/users` | `executors`, `tasks` (+`all`, `new`, `[id]`, `[id]/reply[...]`) |

Страницы тонкие: берут `useMe()` и роль-специфичные хуки, передают их в общие компоненты как пропсы.

## 3. Авторизация и защита маршрутов

- Аутентификация — cookie `access_token`, выставляемая бэкендом; axios шлёт её через `withCredentials: true`. Токен в JS не хранится.
- `middlewares/ProtectedLayout.tsx` (client component, оборачивает всё в `app/(roles)/layout.tsx` со всеми шестью ролями): `useMe()` → если пользователя нет — `router.replace("/login")`; если путь `/admin*` и роль не из `ADMIN_DASHBOARD_ROLES` — редирект на дашборд роли; `/heads*` — допускаются админские роли, HEAD, DEPUTY; `/management-head*` — только MANAGEMENT_HEAD; в конце, если роль не в `roles` — редирект на `roleDashboardPaths[role]`. Пока загрузка / нет пользователя — рендерит `null`. Защита **только клиентская** (серверного `middleware.ts` нет).
- `app/(auth)/login/page.tsx`: react-hook-form (username ≥3, last_name ≥2, password обязателен), `useLogin`, после успеха всегда `router.push("/admin")` — дальше ProtectedLayout перенаправляет по роли.
- `lib/axiosApi.ts`: `baseURL` = `/api` в браузере и `${NEXT_BACK_URL}/api` при SSR. Response-интерцептор: при 401 (кроме запроса с `url === "/users/login"`, один раз через флаг `_retry`) вызывает `POST /users/logout`, редиректит на `/login` (`window.location.replace`) и повторяет исходный запрос. Условие `window.location.pathname !== "/auth/login"` неточно (реальный путь `/login`).
- `constants/main.ts`: `ADMIN_ACCESS_ROLES = [ADMIN, DIVISION_HEAD, MANAGEMENT_HEAD]`, `ADMIN_DASHBOARD_ROLES = [ADMIN, DIVISION_HEAD]`, `roleDashboardPaths` (`ADMIN`/`DIVISION_HEAD`→`/admin`, `MANAGEMENT_HEAD`→`/management-head`, `HEAD`/`DEPUTY`→`/heads`, `USER`→`/users`), `dashboardMenuItems` (label, href, roles, icon) — единственный источник пунктов меню сайдбара. Роли зеркалят enum `UserStatus` бэкенда.

## 4. Слой данных

Паттерн: `services/requests/*` — чистые axios-функции; `services/queries/*` — React Query хуки поверх них; компоненты зовут хуки.

`providers/provider.tsx`: `QueryClient` с `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 1 мин`, `gcTime: 5 мин`; `ReactQueryDevtools` включены.

### Ключи запросов и инвалидации

| Ключ | Откуда |
|---|---|
| `["me"]` | `useMe` (`GET users/me`); инвалидируется в `useLogout` |
| `["users", department_id]` | `useUsers` (`GET users/`) |
| `["user", id]` | `useUserDetail` |
| `["departments"]`, `["department", id]` | `queries/departments.ts` |
| `["managements"]`, `["management", id]` | `queries/managements.ts` |
| `["tasks", tasksPath, params]` | `useTasks(params, tasksPath = "/tasks/")`; включён при `params.management_id !== ""` |
| `["task", tasksPath, id]` | `useTaskDetail(id, tasksPath = "/tasks")` |
| `["replies", "list", task_id]`, `["replies", "detail", reply_id]` | `queries/reply.ts` |

Мутации инвалидируют родственные ключи: задачи → `["tasks"]`/`["task"]`; пользователи → `["users"]`, `["departments"]`; отделы/управления → `["departments"]`, `["managements"]`, `["users"]`; `management-head/organization.ts` — широкий набор (`departments`, `department`, `users`, `user`, `managements`, `tasks`); ответы → `["replies"]` (+`["tasks"]` при создании).

### Таблица запросов (HTTP → бэкенд)

Все пути относительно `/api` (axios `baseURL`).

| Домен | Функция (`services/requests`) | Запрос |
|---|---|---|
| Пользователи (`users.ts`) | `registerUser` / `getMe` / `getUsers(dep?)` / `login` / `logout` / `userUpdate` / `userDetail` / `deleteUser` | `POST /users/`, `GET users/me`, `GET users/`, `POST /users/login`, `POST /users/logout`, `PATCH /users/{id}`, `GET /users/{id}`, `DELETE /admin/users/{id}` |
| Пользователи админ | `admin/users.ts` | `POST|PATCH|DELETE /admin/users[/{id}]` |
| Пользователи HEAD | `heads/users.ts` | `POST|PATCH|DELETE /head/users[/{id}]` |
| Пользователи MGMT-HEAD | `management-head/users.ts` | `POST|PATCH|DELETE /management-head/users[/{id}]` |
| Отделы (`departments.ts`) | `getDepartments`, `getDepartmentById`, `createDepartments`, `updateDepartment`, `deleteDepartment` | `GET /departments/[{id}]`, `POST|PUT|DELETE /admin/departments[/{id}]` |
| Отделы MGMT-HEAD | `management-head/departments.ts` | `POST|PUT|DELETE /management-head/departments[/{id}]` |
| Управления (`managements.ts`) | `getManagements`, `getManagement`, `createManagement`, `updateManagement`, `deleteManagement` | `GET /managements/[{id}]`, `POST|PUT|DELETE /admin/managements[/{id}]` |
| Задачи общие (`tasks.ts`) | `getTasks`, `getTaskDetail`, `postTask`, `putTask`, `patchTaskStatus`, `deleteTask` | `GET {tasksPath}` с query, `GET {tasksPath}/{id}`, `POST /tasks/`, `PUT|PATCH|DELETE /tasks/{id}` |
| Задачи админ (`admin/tasks.ts`) | `postAdminTask`, `putAdminTask`, `patchAdminTaskStatus`, `deleteAdminTask` | `/admin/tasks[/{id}]` |
| Задачи HEAD (`heads/tasks.ts`) | `postHeadsTask`, … | `/head/tasks[/{id}]` |
| Задачи MGMT-HEAD (`management-head/tasks.ts`) | `postManagementHeadTask`, … | `/management-head/tasks[/{id}]` |
| Ответы (`reply.ts`) | `createReply`, `updateReply`, `getReplies`, `getDetailReply`, `deleteReply` | `POST /tasks/{task}/tasks_reply`, `PUT|GET|DELETE /tasks/tasks_reply/{id}`, `GET /tasks/{task}/tasks_reply` (общие для всех ролей) |

`getTasks` собирает `URLSearchParams`: `limit`, `offset`, `department_id`, `management_id`, `from_date`, `to_date`, `rush`, `extra_rush`, `is_expired` (булевы отправляются, если `!== undefined`), `status` (повторяющийся). Роль-специфичный путь списка/деталей задаётся аргументом `tasksPath` (`/tasks/`, `/head/tasks`, `/admin/tasks`, `/management-head/tasks`).

Скачивание файлов — не через axios, а прямой ссылкой: `documentDownloadBasePath` (по умолчанию `/api/tasks/task-documents`, для MGMT-HEAD `/api/management-head/tasks/task-documents`) + `/{doc_id}/download`; для ответов путь `/api/tasks/tasks_reply/{doc_id}/download`.

### Формы с файлами

`services/utils.ts → buildTaskFormData(data)` строит `FormData`: `title`, `description`, `note` (если не null), `deadlines` как `YYYY-MM-DD` (локальная дата, без таймзон), `management_id` (если есть), повторяющиеся `departments_ids`, `executor_ids`, `attachments`, и для обновления — `old_attachments_ids`. Ответы (`reply.ts`) аналогично: `content`, `attachments`, `old_attachments_ids`.

## 5. Типы (`types/`)

- `user.ts`: `UserRole` (6 ролей), `UserType {id, username, last_name, status, department_id, management_id?}`, `UserUpdateType`, `UserRegisterType`, `UserRegisterCheckType` (+`confirmPassword`), `UserResponse`, `UserWithDepartment` (+`department_title`), `LoginFormData`.
- `tasks.ts`: `TasksStatus = NEW|PROGRESS|DONE`, `TaskCreateType`, `TaskUpdateType` (+`old_attachments_ids`), `TaskFormInputs`, `TaskType` (с `author`, `departments`, `executors`, `attachments`), `TasksApiResponseType {total, items}`, `TaskStatusUpdateType`.
- `departments.ts`: `DepartmentType` (с `head`, `deputy_head`), `DepartmentLiteType`, `DepartmentCreateType`, `DepartmentUpdateType`.
- `managements.ts`: `ManagementType` (с `head`, `departments`), `ManagementFormType`, `ManagementUpdateType`.
- `replies.ts`: `ReplyType`, `ReplyCreateType`, `ReplyUpdateType`; `document.ts`: `DocumentLiteType {id, filename}`; `main.ts`: `PagingParams`, `ApiErrorResponse {detail}`.
- Идентификаторы в типах объявлены то `string`, то `number` (в JSON бэкенд отдаёт числа) — при сравнении используют `String(...)`.

## 6. Компоненты (`components/`)

- `sideBar/` (`sideBar.tsx`, `MobileSideBar.tsx`, `MobileTopBar.tsx`) — меню из `dashboardMenuItems`, фильтр по `user.status`, выход через `useLogout` + `router.push("/login")`; `header/Header.tsx`.
- `tasks/` — `allTasksList/AllTasksList` (общий список через `useTasks`, переключатель области `TaskScopeToggle`, пропсы `showScopeToggle`, `scopeBasePath`), `departmentTasksList/DepartmentTasksList` (пропсы `user`, `taskBasePath`, `canCreate`; рендерит `cards/taskKanbanCard`), `createTask/CreateTaskForm`, `taskDetail/TaskDetail`, `taskUpdate/{taskMainInfo,taskExecutors}`, `taskStatusSelect/TaskStatusSelect`, `taskScopeToggle/TaskScopeToggle`, `TaskStatusCounters`, `RushTasks`, `tasksDepartments`.
- `reply/` — `Replies`, `ReplyItem`, `ReplyForm`, `ReplyEditForm`, `ReplyDetail`.
- `executors/` (`ExecutorsView`, `ExecutorDetail`, `ExecutorAddForm`), `departments/` (`DepCard`, `DepartmentCreateForm`), `managements/` (`ManagementsView`, `ManagementForm`), `users/usersCard`, `auth/register-form`, `pagination/pagination`.
- `ui/` — shadcn-примитивы: alert, alert-dialog, avatar, badge, button, card, checkbox, command, dialog, input, input-group, label, popover, select, separator, skeleton, sonner, textarea.

### Параметризация по роли

Общие компоненты получают роль-специфику пропсами, а не выбирают сами:
- `TaskDetail`: `task, user, updateTaskFunc, deleteTaskFunc, isUpdating, isDeleting, replyBasePath` (по умолчанию `/heads/tasks`), `documentDownloadBasePath`. Права внутри: `canEdit` — админский доступ либо задача привязана ровно к одному отделу пользователя; `canDelete` — админский доступ либо автор; `canReply` — отдел пользователя среди отделов задачи.
- `TaskStatusSelect` вызывает все четыре мутации статуса (admin / heads / management-head / общую) и выбирает нужную по роли.
- Страницы `[id]` каждой роли подставляют свои хуки (`useUpdateManagementHeadTask`, `useDeleteManagementHeadTask` и т. п.) и `tasksPath` в `useTaskDetail`.

При добавлении новой роли или роут-ветки нужно синхронно обновить: `UserRole` (`types/user.ts`), `constants/main.ts` (пути, меню, группы), `ProtectedLayout`, роут-дерево, а также соответствующие бэкенд-гейты.

## 7. Известные особенности и риски (наблюдения, не исправлены)

1. Защита маршрутов только клиентская; контент не рендерится до загрузки `me`, но серверных проверок нет (реальная защита — на бэкенде).
2. `lib/axiosApi.ts`: проверка `pathname !== "/auth/login"` не совпадает с реальным путём `/login`; после 401 исходный запрос повторяется один раз сразу после logout-редиректа.
3. `useLogout` ловит ошибки через `try/catch` вокруг `mutate` (не `mutateAsync`) — `catch` недостижим; `router.push("/login")` выполняется без ожидания результата.
4. После логина всегда `/admin`, затем ProtectedLayout исправляет путь (кратковременный лишний переход).
5. `PUT /head/tasks/{id}` на бэкенде ожидает `old_attachments_datas`, а `buildTaskFormData` шлёт `old_attachments_ids` — при обновлении задачи ролью HEAD/DEPUTY старые вложения теряются.
6. (Устранено) раньше compose задавал неиспользуемый `NEXT_API_URL`; теперь он убран.
7. Для общих запросов пользователей/задач путь жёстко `/tasks/` (`postTask`, `putTask`, `deleteTask`) — их использует роль USER; остальные роли идут через свои `/admin|head|management-head` обёртки.
8. В `components/` и `app/` много дублирования между ролями (особенно страницы `[id]` и `new`); при изменении логики задач проверять все четыре ветки.
9. `services/queries/generalQueries/general_queries.ts` и `services/requests/generalRequests/requests.ts` — пустые заготовки.
10. `npm run dev` вне Docker читает `dashboard/.env`, а не корневой `.env_front` — для локальной разработки скопируйте/симлинкуйте его туда.
11. (Исправлено) раньше `lib/axiosApi.ts` выбирал браузерный URL по `MODE`/`NEXT_BACK_URL_WEB` без `NEXT_PUBLIC_` — в бандл они не попадают. Теперь браузер использует `NEXT_PUBLIC_API_URL || "/api"`. `.dockerignore` фронтенда больше не пропускает `dashboard/.env*` в образ, чтобы dev-значения (например `localhost`) не запекались в бандл.
