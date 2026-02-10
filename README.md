# Beauty Call Analyzer

Платформа диагностики и анализа коммуникативных навыков администраторов салонов красоты.

## Стек
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (бренд: оранжевый #E5603A / зелёный #2A8A65)
- Prisma + PostgreSQL
- NextAuth v5 (JWT)
- Anthropic Claude API (анализ)
- OpenAI Whisper API (транскрипция)
- Recharts (radar chart)

---

## Быстрый старт (локально)

### 1. Настройте .env

```bash
cp .env.example .env
# Заполните ANTHROPIC_API_KEY и OPENAI_API_KEY
```

### 2. Поднимите PostgreSQL (через Docker)

```bash
docker run -d \
  --name beauty_postgres \
  -e POSTGRES_USER=beautyuser \
  -e POSTGRES_PASSWORD=beautypass \
  -e POSTGRES_DB=beauty_analyzer \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Примените миграции и заполните БД

```bash
npm run db:push
npm run db:seed
```

### 4. Запустите приложение

```bash
npm run dev
# → http://localhost:3000
```

---

## Запуск через Docker Compose (продакшн)

```bash
# Добавьте API ключи в .env, затем:
docker compose up -d

# Применить миграции в контейнере:
docker exec beauty_app npx prisma db push
docker exec beauty_app npx tsx prisma/seed.ts
```

---

## Тестовые аккаунты (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Владелец | owner@beauty-school.ru | password123 |
| Менеджер | manager@beauty-school.ru | password123 |
| Администратор | admin@beauty-school.ru | password123 |

---

## Структура модулей

| Раздел | Путь | Описание |
|--------|------|----------|
| Дашборд | `/dashboard` | Сводная статистика |
| Анализ звонков | `/analysis/calls` | Загрузка аудио → транскрипция → AI анализ |
| Анализ переписок | `/analysis/chats` | Текст / скриншоты → AI анализ |
| Практические кейсы | `/testing/cases` | Текстовые кейсы с AI оценкой |
| Ролевые игры | `/testing/roleplay` | Голосовой / текстовый ответ с AI оценкой |
| ХПВ-тест | `/testing/products` | Тест знания продуктов |
| CRM-тест | `/testing/crm` | Тест работы с клиентской базой |
| Карточка | `/admin-card` | Сводная карточка с radar chart + PDF |
| Настройки | `/settings` | CRUD продуктов, брендинг |

---

## AI Промпты

Все промпты в `src/lib/ai/prompts.ts`. Включают полную базу знаний продаж:
- 7 этапов воронки продаж салона
- Техники работы с возражениями (ХПВ, разбивка цены, альтернативный выбор)
- Стандарты переписки и скорости ответа
- Типичные ошибки администраторов
