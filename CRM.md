# SPEC: CRM-система (изолированный проект)

> Standalone-проект. Точка расширения на будущее — раздел 13 (интеграция с формой заявок).

## 1. Стек технологий

| Слой | Технология | Комментарий |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript | Единый проект для UI и backend |
| Стилизация | Tailwind CSS | Своя дизайн-система, без привязки к другим проектам |
| База данных | Turso (libSQL / SQLite) | Один стек с support-агентом |
| Клиент БД | `@libsql/client` | Официальный SDK |
| Аутентификация | Собственная, на JWT + httpOnly cookie | У Turso нет встроенного Auth (в отличие от Supabase) — реализуем сами |
| Хэширование паролей | `bcryptjs` | Работает в Node.js runtime (не Edge) |
| Подпись/проверка JWT | `jose` | Edge-совместим — нужен для проверки токена в `middleware.ts` |
| Drag-and-drop (Kanban) | `@dnd-kit/core` | Активно поддерживается (в отличие от устаревшего `react-beautiful-dnd`) |
| Графики | `recharts` | Столбчатые/линейные/круговые диаграммы на дашборде |
| Хостинг | Vercel | Frontend + API routes вместе |

---

## 2. Роли и права доступа

Две роли:

| Роль | Права |
|---|---|
| `admin` | Видит все заявки, клиентов и задачи (всех сотрудников). Управляет пользователями (создать/деактивировать/сменить роль). Видит полную аналитику, включая разбивку по сотрудникам. |
| `manager` | Видит и редактирует только заявки/задачи, назначенные на него. Может создавать новых клиентов и заявки. Видит аналитику только по своим показателям. |

Проверка роли — на уровне API route (не только скрытие в UI): каждый защищённый route должен проверять `role` из сессии, а не полагаться на то, что фронтенд просто не показал кнопку.

---

## 3. Модель данных

### 3.1 TypeScript-типы

```typescript
type UserRole = 'admin' | 'manager';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

type LeadStatus = 'new' | 'in_progress' | 'waiting' | 'won' | 'lost';
type LeadSource = 'website_form' | 'telegram_bot' | 'phone' | 'referral' | 'manual' | 'other';

interface Lead {
  id: string;
  client_id: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to: string | null;  // user.id
  value: number | null;         // потенциальная сумма сделки, опционально
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type TaskStatus = 'pending' | 'done';

interface Task {
  id: string;
  lead_id: string | null;      // задача может быть привязана к заявке...
  client_id: string | null;    // ...или к клиенту напрямую
  assigned_to: string;          // user.id
  title: string;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
}
```

### 3.2 SQL-схема (SQLite/Turso)

```sql
create table users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'manager',
  is_active integer not null default 1,
  created_at text not null
);

create table clients (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at text not null
);

create table leads (
  id text primary key,
  client_id text not null references clients(id),
  source text not null default 'manual',
  status text not null default 'new',
  assigned_to text references users(id),
  value real,
  notes text,
  created_at text not null,
  updated_at text not null
);

create table tasks (
  id text primary key,
  lead_id text references leads(id),
  client_id text references clients(id),
  assigned_to text not null references users(id),
  title text not null,
  due_date text,
  status text not null default 'pending',
  created_at text not null
);
```

`id` везде — `crypto.randomUUID()`, генерируется в коде (в SQLite нет автогенерации UUID). Даты — ISO-строки (`new Date().toISOString()`).

---

## 4. Аутентификация

- `POST /api/auth/login` — принимает `{ email, password }`, ищет пользователя, сверяет пароль через `bcrypt.compare`, при успехе подписывает JWT (`jose`) с payload `{ userId, role }`, ставит httpOnly-cookie (`session`, `SameSite=Lax`, срок — например, 7 дней).
- `POST /api/auth/logout` — очищает cookie.
- `middleware.ts` — на каждый запрос к защищённым путям (`/dashboard`, `/leads`, `/clients`, `/tasks`, `/users`, весь `/api/*` кроме `/api/auth/login`) проверяет и верифицирует JWT из cookie (`jose.jwtVerify`, edge-совместимо). Нет валидной cookie — редирект на `/login`. Путь `/users` и его API — дополнительно проверяют `role === 'admin'`, иначе 403/редирект на `/dashboard`.
- Первый admin-пользователь создаётся не через UI (иначе кто угодно может себя назначить админом), а один раз вручную — сидинг-скрипт (`scripts/seed-admin.ts`), который читает email/пароль из `.env.local` и создаёт запись в `users` с `role: 'admin'`, если её ещё нет.

---

## 5. Структура файлов

```
app/
├── login/page.tsx
├── dashboard/page.tsx                # аналитика и графики
├── leads/page.tsx                    # Kanban-доска
├── leads/[id]/page.tsx               # карточка заявки
├── clients/page.tsx                  # список клиентов
├── clients/[id]/page.tsx             # карточка клиента (история заявок)
├── tasks/page.tsx                    # список задач
├── users/page.tsx                    # управление сотрудниками (только admin)
└── api/
    ├── auth/login/route.ts
    ├── auth/logout/route.ts
    ├── leads/route.ts                # GET (список), POST (создать)
    ├── leads/[id]/route.ts           # PATCH (статус/назначение/заметки)
    ├── clients/route.ts
    ├── clients/[id]/route.ts
    ├── tasks/route.ts
    ├── tasks/[id]/route.ts
    ├── users/route.ts                # только admin
    └── analytics/route.ts            # агрегированные данные для дашборда

components/
├── kanban/KanbanBoard.tsx, KanbanColumn.tsx, LeadCard.tsx
├── charts/LeadsOverTimeChart.tsx, StatusBreakdownChart.tsx, SourceBreakdownChart.tsx, TeamPerformanceChart.tsx
├── forms/LeadForm.tsx, ClientForm.tsx, TaskForm.tsx, UserForm.tsx
└── layout/Sidebar.tsx, TopBar.tsx

lib/
├── turso.ts        # клиент базы
├── auth.ts          # подпись/проверка JWT, хэширование паролей
└── session.ts        # получить текущего пользователя из cookie (для server components)

middleware.ts
scripts/seed-admin.ts
types/crm.types.ts
```

---

## 6. Страницы и функциональность

### 6.1 `/login`
Форма email + пароль. Ошибка — общее сообщение "неверный email или пароль" (не уточнять, что именно неверно — не давать подсказку для перебора).

### 6.2 `/dashboard`
Карточки-метрики сверху (всего заявок за период, конверсия %, среднее время закрытия) + графики (раздел 9). У `manager` — те же графики, но отфильтрованные только по его заявкам.

### 6.3 `/leads` — Kanban-доска
Колонки по `LeadStatus`: Новая → В работе → Ожидание → Успешно / Отказ. Карточка — имя клиента, источник, сумма (если есть), кто назначен (только у admin — у manager своя колонка одна, и так все его). Drag-and-drop между колонками — меняет `status` через `PATCH /api/leads/[id]`. Кнопка "+ Новая заявка" открывает `LeadForm` (выбор существующего клиента или создание нового прямо из формы).

### 6.4 `/leads/[id]`
Детали заявки: клиент (ссылка на карточку клиента), источник, статус (выпадающий список), назначенный сотрудник (только admin может переназначить), сумма, заметки (свободный текст, дозаписывается — история изменений не хранится в MVP, просто одно текстовое поле), список задач, привязанных к этой заявке.

### 6.5 `/clients` и `/clients/[id]`
Список клиентов с поиском по имени/телефону. Карточка клиента — контактные данные + список всех его заявок (история) + возможность создать новую заявку прямо отсюда.

### 6.6 `/tasks`
Список задач с фильтром "Мои задачи" / "Все" (последнее — только admin), сортировка по `due_date`, просроченные — визуально выделены (например, красный текст даты). Чекбокс — отметить выполненной.

### 6.7 `/users` (только admin)
Таблица сотрудников: имя, email, роль, активен/нет. Кнопки: создать нового (форма с временным паролем, который сотрудник должен сменить при первом входе — опционально для MVP, можно сначала без этого), деактивировать (не удалять — `is_active: 0`, чтобы не терять историю его заявок).

---

## 7. API-контракт (кратко)

| Метод | Путь | Кто может | Что делает |
|---|---|---|---|
| POST | `/api/auth/login` | все | вход, ставит cookie |
| POST | `/api/auth/logout` | все авторизованные | очищает cookie |
| GET | `/api/leads` | все авторизованные | admin — все заявки, manager — только свои |
| POST | `/api/leads` | все авторизованные | создать заявку |
| PATCH | `/api/leads/[id]` | admin — любую, manager — только свою | изменить статус/назначение/заметки |
| GET/POST | `/api/clients` | все авторизованные | список / создать клиента |
| GET | `/api/clients/[id]` | все авторизованные | карточка клиента + его заявки |
| GET/POST | `/api/tasks` | все авторизованные | список (свои/все) / создать задачу |
| PATCH | `/api/tasks/[id]` | владелец задачи или admin | изменить статус/срок |
| GET/POST/PATCH | `/api/users` | только admin | управление сотрудниками |
| GET | `/api/analytics` | все авторизованные | агрегированные данные (см. раздел 9), для manager — отфильтровано по нему |

---

## 8. Kanban-доска — детали реализации

- `@dnd-kit/core` — обёртка `DndContext` на всю доску, каждая колонка — `useDroppable`, каждая карточка — `useDraggable`.
- При отпускании карточки в другую колонку — сначала оптимистично обновить локальный state (карточка визуально сразу в новой колонке), затем отправить `PATCH`. Если запрос упал — откатить обратно и показать уведомление об ошибке (иначе UI будет врать пользователю о реальном статусе в базе).
- Колонка "Отказ" (`lost`) — при переносе карточки туда можно (не обязательно на MVP) показывать модалку "укажите причину отказа" — записывается в `notes` заявки.

---

## 9. Дашборд и аналитика

`GET /api/analytics` возвращает агрегаты одним запросом (не гонять фронт по отдельным эндпоинтам на каждый график):

```typescript
interface AnalyticsResponse {
  leadsOverTime: { date: string; count: number }[];      // для линейного графика, по дням/неделям
  statusBreakdown: { status: LeadStatus; count: number }[]; // для круговой диаграммы
  sourceBreakdown: { source: LeadSource; count: number }[]; // для столбчатой диаграммы
  conversionRate: number;                                    // won / (won + lost), в процентах
  teamPerformance?: { userId: string; userName: string; won: number; total: number }[]; // только для admin
}
```

Для `manager` — все агрегаты считаются только по его `assigned_to`, `teamPerformance` не возвращается вовсе (не должен видеть чужие показатели).

Графики через `recharts`: `LineChart` (заявки по времени), `PieChart` (статусы), `BarChart` (источники и — у admin — сравнение сотрудников).

---

## 10. Задачи и напоминания

MVP без push-уведомлений и email-рассылки о просроченных задачах — только визуальное выделение на странице `/tasks` и, опционально, счётчик просроченных задач в `Sidebar` (бейдж с числом). Реальные напоминания (email/Telegram) — хорошее расширение на будущее, но не в первой версии.

---

## 11. Обработка ошибок и edge cases

| Сценарий | Поведение |
|---|---|
| Неверный email/пароль при входе | Общее сообщение, без уточнения какого поля |
| Manager пытается открыть чужую заявку напрямую по URL | 403 на уровне API, редирект/сообщение на фронте |
| Manager пытается зайти на `/users` | Редирект на `/dashboard` |
| Ошибка при drag-and-drop (PATCH упал) | Откат карточки в исходную колонку, toast с ошибкой |
| Деактивированный пользователь (`is_active: 0`) пытается войти | Логин отклоняется тем же общим сообщением, что и неверный пароль (не раскрывать, что аккаунт существует, но заблокирован) |
| Заявка без `client_id` (не должна создаваться без клиента) | Валидация на API: `client_id` обязателен при создании lead |

---

## 12. План разработки (этапы)

1. **Этап 1 — Аутентификация:** таблица `users`, `lib/auth.ts`, `login/logout` роуты, `middleware.ts`, `scripts/seed-admin.ts`.
2. **Этап 2 — Клиенты и заявки (без Kanban, просто таблицы-списки):** `clients`/`leads` роуты и страницы в виде обычных таблиц со статусом как текстом.
3. **Этап 3 — Kanban-доска:** `@dnd-kit`, drag-and-drop между статусами.
4. **Этап 4 — Задачи:** `tasks` роуты и страница, привязка к заявкам/клиентам.
5. **Этап 5 — Дашборд и графики:** `/api/analytics` + `recharts`-компоненты.
6. **Этап 6 — Управление пользователями:** `/users`, только для admin.

---

## 13. Точки расширения на будущее — источники лидов извне

### 13.1 Форма обратной связи с сайта

Когда CRM будет готова, форму обратной связи (см. отдельный универсальный промпт) можно будет донастроить, чтобы она не только слала уведомление в Telegram, но и создавала запись в `leads` (и `clients`, если такого клиента ещё нет) через внутреннюю функцию наподобие `createLeadFromWebsite({ name, contact, message })` в `lib/leads.ts` — с `source: 'website_form'`. Это отдельный шаг после того, как оба проекта существуют независимо, специально не реализуется сейчас.

### 13.2 Заявки напрямую из Telegram-бота (клиент пишет боту, а не на сайте)

Это принципиально другая механика, чем отправка уведомлений (раздел 13.1 и форма обратной связи) — там бот только **отправляет** сообщения через `sendMessage`. Здесь бот должен **принимать** входящие сообщения от клиентов, а для этого Telegram должен уметь стучаться к твоему серверу сам — через **вебхук**.

**Как это устроено:**

1. **Регистрация вебхука** (один раз, не из кода приложения, а отдельной командой):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<твой-домен>/api/telegram/webhook&secret_token=<случайная-строка>
   ```
   С этого момента Telegram сам отправляет `POST`-запрос на этот адрес при каждом новом сообщении боту.

   ⚠️ Вебхуку нужен реальный публичный HTTPS-адрес — на локальной разработке (`localhost`) это не сработает без туннеля (например, `ngrok`) наружу. Тестировать эту часть удобнее уже на задеплоенной версии CRM (Vercel даёт HTTPS сразу из коробки).

2. **`app/api/telegram/webhook/route.ts`** — принимает `POST` с телом вида:
   ```json
   {
     "message": {
       "from": { "id": 123456, "first_name": "Иван", "username": "ivan_uz" },
       "chat": { "id": 123456 },
       "text": "Здравствуйте, хочу записаться на диагностику"
     }
   }
   ```
   Обязательно проверить заголовок `X-Telegram-Bot-Api-Secret-Token` — он должен совпадать с тем, что задавали при регистрации вебхука. Без этой проверки кто угодно, кто узнает адрес роута, сможет присылать поддельные "заявки" от твоего имени.

3. **Логика обработки:**
   - Найти клиента в `clients` по `telegram_id` (нужно добавить это поле в таблицу `clients` — `telegram_id text unique`). Если не найден — создать нового клиента, взяв имя из `first_name`/`username`.
   - Создать `lead` с `source: 'telegram_bot'`, `notes: <текст сообщения>`.
   - Опционально — сразу ответить клиенту через `sendMessage`: "Спасибо, ваша заявка принята, мы свяжемся с вами в ближайшее время" — чтобы у клиента было подтверждение, а не тишина.

4. **`.env` добавляется:**
   ```
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_WEBHOOK_SECRET=
   ```

**Важный практический вопрос, который стоит решить заранее:** использовать для этого **того же бота**, что уже отправляет уведомления о заявках (из формы обратной связи), или **отдельного** — специально под приём заявок от клиентов? Разные боты чище разделяют роли ("бот для клиентов" vs "бот-уведомление для владельца"), но требуют вести два токена вместо одного. Для небольшого бизнеса, скорее всего, оправдан один бот на обе задачи.

Как и с формой обратной связи, это отдельный шаг после того, как CRM уже существует и задеплоена — не реализуется сейчас.

---

## 14. Осознанные упрощения (не production-grade из коробки)

- Сессия — один JWT в cookie без refresh-токена и без возможности принудительно "разлогинить" пользователя раньше истечения срока (например, при увольнении сотрудника это должно быть `is_active: 0` + переиздание сессий, но в MVP уволенный с активным токеном сможет пользоваться CRM до истечения 7 дней).
- Нет rate limiting на `/api/auth/login` — в реальном продакшене стоит добавить защиту от перебора пароля.
- История изменений заявки (кто и когда поменял статус) не хранится отдельно — только текущее состояние плюс произвольные заметки.
- Нет email/push-напоминаний о задачах — только визуальное выделение в интерфейсе.
- Первый admin создаётся скриптом, не через UI — сознательно, чтобы никто не мог зарегистрироваться сам себе с ролью admin.

Эти упрощения нормальны для внутреннего/учебного использования, но стоит держать в голове при использовании в реальном бизнесе с чувствительными данными клиентов.
