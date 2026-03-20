# AI Chat Preview Design

## Goal

Добавить на экран [`receipt/[id]`](/Users/user/Developer/receipt-ai/.worktrees/codex-ai-chat-preview/app/receipt/[id]/page.tsx) AI-чат с заметной кнопкой входа рядом с названием чека. На этой итерации AI не применяет изменения в форму: он может только
- задать уточняющий вопрос;
- вернуть `structured output` со структурой чека;
- вернуть `structured output` с клеймами.

Оба JSON-ответа должны рендериться как preview прямо в чате.

## Scope

В этой итерации делаем только preview:
- без `apply`;
- без `revert`;
- без записи AI-ответа в `react-hook-form`;
- без изменения autosave-поведения существующей формы.

## Existing Constraints

- Основное состояние чека уже живёт в [`useReceiptFormState`](/Users/user/Developer/receipt-ai/.worktrees/codex-ai-chat-preview/app/receipt/[id]/useReceiptFormState.ts).
- Экран summary уже реализован в [`SummaryScreen`](/Users/user/Developer/receipt-ai/.worktrees/codex-ai-chat-preview/app/receipt/components/SummaryScreen/SummaryScreen.tsx) и подходит для claims preview.
- Структурная схема для LLM уже есть в [`model/receipt/schema-structural.ts`](/Users/user/Developer/receipt-ai/.worktrees/codex-ai-chat-preview/model/receipt/schema-structural.ts).
- В проекте уже есть browser visual tests для `ReceiptFormInner`, и новый UI нужно покрывать тем же способом.

## UX

На строке заголовка чека появляется кнопка входа в AI-чат:
- находится в одном ряду с названием чека;
- визуально читается как AI entrypoint;
- использует радужную обводку/ореол;
- имеет явный chat affordance через иконку и текст.

По нажатию открывается `Dialog` с:
- историей сообщений;
- полем ввода;
- карточками preview внутри ответов AI.

## AI Response Contract

Вводим union-ответ от сервера:
- `question`
- `structural_preview`
- `claims_preview`

### question

Обычное текстовое сообщение ассистента.

### structural_preview

Содержит JSON, валидируемый отдельной preview-схемой на базе structural receipt schema. На клиенте такой ответ рендерится read-only preview-компонентом:
- meta;
- positions;
- fees/discounts;
- totals.

### claims_preview

Содержит JSON preview по клеймам. Для клиента сервер должен вернуть уже готовый `Receipt` snapshot, чтобы UI просто переиспользовал `SummaryScreen` и не занимался сложной нормализацией.

## Rendering Strategy

### Structural preview

Делаем отдельный read-only preview-компонент, стилистически собранный из текущих receipt UI patterns. Он показывает структуру как receipt draft, но без edit affordances.

### Claims preview

Переиспользуем [`SummaryScreen`](/Users/user/Developer/receipt-ai/.worktrees/codex-ai-chat-preview/app/receipt/components/SummaryScreen/SummaryScreen.tsx) на receipt snapshot, который пришёл от сервера.

## Architecture

Добавляем отдельный receipt-chat API endpoint, который получает:
- `receiptId`;
- текущий receipt context;
- историю сообщений;
- новый user prompt.

Сервер:
- вызывает LLM;
- валидирует ответ union-схемой;
- для claims preview возвращает нормализованный `Receipt`;
- для structural preview возвращает строго структурный preview payload;
- для question возвращает текст.

Клиент:
- хранит локальную историю чата;
- отправляет сообщения через новый `apiClient` метод;
- рендерит preview по `type`;
- не пишет AI-данные в форму.

## Testing

Нужно покрыть browser visual test на базе существующего `ReceiptFormInner.browser.test.tsx`:
- AI-кнопка рядом с названием чека;
- открытие AI-чата;
- состояние с `question`;
- состояние с `structural_preview`;
- состояние с `claims_preview`.

Скриншоты должны фиксировать новый entrypoint и хотя бы одно preview-состояние чата.

## Non-Goals

- Применение AI-изменений в форму
- История undo/redo
- Partial merge AI-ответов в existing form state
- Автоматическое изменение claims/structure без подтверждения пользователя
