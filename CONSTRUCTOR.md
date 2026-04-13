# Конструктор мероприятий (СмартОценка)

Документ описывает техническое задание, план внедрения, фактически внесённые изменения и направления дальнейшей разработки.

---

## 1. Техническое задание (сводка)

### 1.1 Цель

Дать организатору в личном кабинете инструмент **«Конструктор»** для создания мероприятия (конкурса) с полным набором данных: общая информация, обложка, критерии оценки, участники, жюри, сохранение каркаса как шаблона.

### 1.2 Функциональные требования

| № | Требование | Примечание |
|---|------------|------------|
| 1 | Название мероприятия | Обязательное поле |
| 2 | Тип конкурса | Минимум два варианта (например, «Мисс мира», «Мисс вселенная»), расширяемый список |
| 3 | Обложка | Изображение; хранение как **URL файла** на сервере; превью в UI до отправки; загрузка на сервер **только при подтверждении создания** |
| 4 | Критерии | Отдельная сущность в БД; название + **верхняя граница** оценки; **нижняя граница всегда 1**; своя верхняя граница у каждого критерия |
| 5 | Участники | Фото, ФИО, возраст, страна; создание в БД и связь с конкурсом |
| 6 | Жюри | Фото, ФИО, должность, телефон, **пароль** для входа в кабинет; связь с конкурсом; **телефон уникален в рамках одного конкурса** (один и тот же человек может быть жюри в разных конкурсах); ФИО и телефон в `User`, фото и должность в записи `Jury` |
| 7 | Шаблон | Сохранение **каркаса**: тип конкурса + критерии с верхними границами (без участников/жюри/обложки в шаблоне) |

### 1.3 Нефункциональные требования

- Клиент: архитектура в духе **FSD** (entities / features / pages / shared).
- Сервер: слои routes → controllers → services, единый формат ответов и обработка ошибок.
- Файлы конструктора: каталог **`server/public`** (подпапки по типу контента), раздача по префиксу **`/media`**.

### 1.4 Кабинет жюри (текущий этап)

После создания мероприятия жюри входит по телефону и паролю и видит список мероприятий, к которым допущено (**уже поддерживается** через `GET /contests` для роли `jury`). Детальный экран оценки — **следующий этап**.

---

## 2. План реализации (как было выполнено)

1. **БД и модели** — миграции полей для `contests`, `participants`, `jury`, `event_templates`; обновление Sequelize-моделей.
2. **Загрузка файлов** — `multer` → `public/contests|participants|jury`, уникальные имена; статика `/media`.
3. **API** — атомарное создание мероприятия (`multipart`: JSON `payload` + файлы); справочник типов конкурса; доработка жюри (повторное использование пользователя по телефону между конкурсами); шаблоны как каркас.
4. **Клиент** — маршрут формы создания, MobX-стор черновика, модалки участника/жюри, `FormData` и корректная работа axios с `FormData`.
5. **Интеграция в кабинет** — переход с «Конструктора», выбор шаблона по `templateId` в query.

---

## 3. Сделанные изменения (факт)

### 3.1 Сервер

| Область | Изменения |
|---------|-----------|
| Миграции | `20260412120000-add-constructor-fields.js`, `20260412120100-add-template-contest-type.js` |
| Модели | `Contest.js`, `Participant.js`, `Jury.js`, `EventTemplate.js` |
| Константы | **`constants/contestTypes.js`** — допустимые типы и подписи |
| Конфиг | **`multerPublic.js`**; `serverConfig.js` — `app.use('/media', static('public'))` |
| Сервисы | `contestService.js` (`createContestFull`, валидация payload), `juryService.js` (assign + повторный телефон), `participantService.js`, `criterionService.js`, `templateService.js` |
| Контроллеры | `contestController.js`, `juryController.js`, `participantController.js`, `templateController.js` |
| Маршруты | `contestRoutes.js` — `GET .../meta/contest-types`, `POST .../create-full` + multer |
| Прочее | `server/.gitignore` — игнор загруженных файлов в `public/*` (кроме `.gitkeep`) |
| Статика | Каталоги **`server/public/contests`**, `participants`, `jury` с `.gitkeep` |

### 3.2 Клиент

| Область | Изменения |
|---------|-----------|
| Фича | **`features/event-constructor/`** — форма, модалки, стор `createEventFormStore.ts` |
| Страница | **`pages/create-event-page/`** — `CreateEventPage` |
| Маршрутизация | `routesConfig.tsx` — путь `/cabinet/constructor/new` |
| Кабинет | `CabinetPage.tsx` + `CabinetPage.module.css` — переход на форму, клик по шаблону |
| Сущность contest | типы, `contestApi.ts` (`getContestTypes`, `createContestFull`), `index.ts` |
| Сущность template | типы (каркас), `templateApi.ts` (`getTemplateById`, `createTemplate`), `TemplateCard`, экспорты |
| Shared | **`shared/lib/mediaUrl.ts`**, `axiosInstance.ts` (снятие `Content-Type` для `FormData`), `shared/index.ts` |
| Экспорт страниц | `pages/index.tsx` |

### 3.3 Команды после выгрузки репозитория

```bash
cd server
npx sequelize-cli db:migrate
```

Убедиться, что переменная **`CLIENT_URL`** в `.env` сервера соответствует origin клиента (CORS).

---

## 4. Дальнейшее развитие (роадмап)

### 4.1 Оценка жюри

- Экран мероприятия для жюри: список участников × критерии, ввод баллов в диапазоне **[1, maxScore]** по каждому критерию.
- API: использование/расширение сущности **`Score`**, проверка прав (жюри назначен на конкурс, конкурс в статусе «идёт оценка»).
- Оптимистичное сохранение или автосейв черновика оценок.

### 4.2 Сбор и статистика результатов

- Агрегация по участникам: средние/взвешенные баллы (при появлении весов критериев), разброс по жюри.
- Экспорт (CSV/Excel), графики для организатора.

### 4.3 Жизненный цикл конкурса

- Поля статуса: **черновик → приём оценок → завершён → архив** (или упрощённая схема).
- Переходы только для организатора; для жюри — блокировка ввода после завершения.

### 4.4 Архив и оглашение результатов

- Раздел «Архив» в кабинете организатора с фильтрами по дате/типу.
- Публикация итогов: фиксированный порядок мест, опционально «топ-N», печать/публичная ссылка (если появится публичная часть сайта).

### 4.5 Прочие улучшения

- `GET /contests/:id` с вложениями для карточки/редактирования.
- Единые **русские** тексты ошибок API.
- Разделение axios interceptor: **401** для refresh, не **403** для бизнес-отказа.

---

## 5. Дерево проекта (релевантная часть)

Условные обозначения:

- **`[+]`** — добавлено в рамках конструктора  
- **`[~]`** — существенно изменено под конструктор  

```text
beautyEvents/
├── CONSTRUCTOR.md                          [+]  ← этот файл
│
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   └── config/
│   │   │       └── routesConfig.tsx        [~]  маршрут /cabinet/constructor/new
│   │   │
│   │   ├── entities/
│   │   │   ├── contest/
│   │   │   │   ├── api/contestApi.ts       [~]  createContestFull, getContestTypes
│   │   │   │   ├── model/contest.types.ts  [~]  contestType, coverImageUrl
│   │   │   │   └── index.ts                [~]  реэкспорты
│   │   │   └── template/
│   │   │       ├── api/templateApi.ts      [~]  getTemplateById, createTemplate
│   │   │       ├── model/template.types.ts [~]  каркас критериев, contestType
│   │   │       ├── ui/TemplateCard.*       [~]  отображение типа шаблона
│   │   │       └── index.ts                [~]
│   │   │
│   │   ├── features/
│   │   │   └── event-constructor/          [+]  вся фича конструктора
│   │   │       ├── index.ts
│   │   │       ├── model/createEventFormStore.ts
│   │   │       └── ui/
│   │   │           ├── CreateEventForm.tsx
│   │   │           ├── CreateEventForm.module.css
│   │   │           ├── ParticipantProfileModal.tsx
│   │   │           ├── JuryProfileModal.tsx
│   │   │           └── ProfileModal.module.css
│   │   │
│   │   ├── pages/
│   │   │   ├── index.tsx                   [~]  экспорт CreateEventPage
│   │   │   ├── cabinet-page/
│   │   │   │   ├── CabinetPage.tsx         [~]  навигация на форму и шаблоны
│   │   │   │   └── CabinetPage.module.css  [~]  .templateCardBtn
│   │   │   └── create-event-page/          [+]
│   │   │       ├── CreateEventPage.tsx
│   │   │       └── CreateEventPage.module.css
│   │   │
│   │   └── shared/
│   │       ├── api/axiosInstance.ts        [~]  FormData + Content-Type
│   │       ├── lib/mediaUrl.ts             [+]  resolveMediaUrl
│   │       └── index.ts                    [~]
│   │
│   └── …
│
└── server/
    ├── public/                             [+]  загрузки (contests / participants / jury)
    ├── .gitignore                          [~]  игнор загруженных файлов в public
    └── src/
        ├── constants/
        │   └── contestTypes.js             [+]
        ├── config/
        │   ├── multerPublic.js             [+]
        │   └── serverConfig.js             [~]  /media → public
        ├── controllers/
        │   ├── contestController.js        [~]
        │   ├── juryController.js           [~]
        │   ├── participantController.js    [~]
        │   └── templateController.js       [~]
        ├── routes/
        │   └── contestRoutes.js            [~]
        ├── services/
        │   ├── contestService.js           [~]
        │   ├── juryService.js              [~]
        │   ├── participantService.js       [~]
        │   ├── criterionService.js         [~]
        │   └── templateService.js          [~]
        └── db/
            ├── migrations/
            │   ├── 20260412120000-add-constructor-fields.js   [+]
            │   └── 20260412120100-add-template-contest-type.js [+]
            └── models/
                ├── Contest.js              [~]
                ├── Participant.js          [~]
                ├── Jury.js                 [~]
                └── EventTemplate.js        [~]
```

В дереве **не** показаны `node_modules`, `dist`, прочие файлы клиента/сервера без прямой связи с конструктором.

---

## 6. Версия документа

- Документ актуален на момент добавления файла `CONSTRUCTOR.md` в корень репозитория `beautyEvents`.
- При изменении конструктора имеет смысл обновлять разделы **3** и **5** и при необходимости дополнять **4**.
