# beautyEvents — инструкции для AI-агента

Конфигурация в **`.cursor/`**:

| Каталог | Содержимое |
|---------|------------|
| `rules/` | Правила; **главное:** `karpathy-behavioral-guidelines.mdc` |
| `skills/` | `beauty-events-dev`, `ci-cd-deploy` |
| `plans/` | `environment-variables.md`, `ci-cd-docker-deploy.md` |

Опирайся на `.cursor/rules/` и `.cursor/plans/`, не на `~/.cursor/plans/`.

**Стек:** `client/` (React + Vite + TS), `server/` (Express + Sequelize + PostgreSQL).

**Планы:** env — выполнен; CI/CD — см. `.cursor/plans/ci-cd-docker-deploy.md`.
