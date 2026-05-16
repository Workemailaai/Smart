# Настройки Cursor для проекта beautyEvents

Конфигурация агента для **этого репозитория** — в `.cursor/`.  
Глобальные `~/.cursor/plans/` и User Rules — отдельно; для команды важно то, что в git.

## Структура

```
.cursor/
├── README.md
├── .cursorignore          # исключения для индексации AI
├── rules/                 # *.mdc — правила агента
├── skills/                # <имя>/SKILL.md
└── plans/                 # планы (markdown, в git)
```

Корень репозитория: `AGENTS.md`, `.vscode/settings.json`.

## Правила (приоритет)

| Файл | alwaysApply | Назначение |
|------|-------------|------------|
| `karpathy-behavioral-guidelines.mdc` | да | Базовое поведение (простота, хирургические правки, критерии успеха) |
| `russian-agent.mdc` | да | Русский язык, план перед работой |
| `project-context.mdc` | да | Стек и структура beautyEvents |
| `code-quality.mdc` | да | UI, зависимости (дополнение к Karpathy) |
| `naming-conventions.mdc` | по glob | Именование в client/server |
| `git-and-commits.mdc` | нет | Git и PR по запросу |

## Планы vs глобальный Cursor

| Расположение | Назначение |
|--------------|------------|
| `~/.cursor/plans/*.plan.md` | UI Plan Cursor, часто `isProject: false` |
| `.cursor/plans/*.md` | Планы **проекта**, для агента и команды |

После Plan в UI: скопируйте файл сюда и уберите `isProject: false` / YAML-todos (см. `ci-cd-docker-deploy.md`).

## Новый проект

Скопируйте `.cursor/`, `AGENTS.md`, `.vscode/settings.json` → отредактируйте `project-context.mdc` и планы.

## Git

Коммитим `.cursor/` (кроме `*.local`). Секреты — только в `.env` (не в git).
