---
name: beauty-events-dev
description: >-
  Разработка в монорепозитории beautyEvents (React/Vite + Express/Sequelize).
  Используй при задачах по конкурсам, жюри, организатору, API, миграциям БД
  и переменным окружения.
---

# Разработка beautyEvents

## Быстрый старт

1. Прочитай `.cursor/rules/project-context.mdc`.
2. Env — `.cursor/plans/environment-variables.md`; CI/CD — `.cursor/plans/ci-cd-docker-deploy.md`.
3. Клиент: `cd client && npm run dev` (порт 5173).
4. Сервер: `cd server && npm run dev` (порт 3000).

## Где искать код

| Задача | Путь |
|--------|------|
| Роуты UI | `client/src/app/config/routesConfig.tsx` |
| API конкурсов | `client/src/entities/contest/`, `server/src/controllers/contestController.js` |
| Авторизация | `client/src/features/auth/`, `server/src/middleware/verifyAccessToken.js` |
| Модели БД | `server/src/db/models/` |
| Миграции | `server/src/db/migrations/` |

## Проверка перед PR

- TypeScript: сборка клиента без ошибок.
- Нет `localhost:3000` в production-сборке (`client` build + проверка `server/public/dist`).
- Секреты не в коммите.
