---
name: ci-cd-deploy
description: >-
  Настройка CI/CD, Docker и деплоя beautyEvents на Selectel через GitHub Actions.
  Используй при ветках test/main, Dockerfile, workflows, docker-compose и deploy.sh.
---

# CI/CD и деплой beautyEvents

## План

Полный чеклист и схема: **`.cursor/plans/ci-cd-docker-deploy.md`**.

## Кратко

- **PR** → только CI (lint, build, docker build), без деплоя.
- **Push в `test`** → образ test; SSH-деплой — когда будет VPS.
- **Push в `main`** → build-push + SSH на Selectel.
- Секреты на сервере в `/opt/beautyevents/.env.production`, не в образе.
- Multi-stage `Dockerfile` в **корне** репозитория (client + server).

## Связанные файлы

- `server/Dockerfile` — устаревает после корневого Dockerfile
- `server/package.json` — `db:setup:prod`, `cross-env`
- Env: `.cursor/plans/environment-variables.md`
