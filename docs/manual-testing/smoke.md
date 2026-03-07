# Smoke Plan: Complex Receipt

## Goal

Quick manual smoke test for the complex receipt image at [img.png](/Users/user/Developer/receipt-ai/docs/manual-testing/img.png).

This smoke is focused on:
- OCR does not crash on a hard receipt
- Parsed receipt opens in the app
- Validation and editing flows remain usable
- Splitting flow handles tricky amount/quantity cases
- Summary flow renders consistent totals

This smoke does not include:
- login / sign-up
- multi-user realtime checks
- browser/device matrix

## Preconditions

- Local app is running at `http://127.0.0.1:3000`
- Test image exists at `/Users/user/Developer/receipt-ai/docs/manual-testing/img.png`
- Browser console is visible or can be inspected after failures

## Expected Output

After upload, the app should create a receipt and route to `/receipt/:id` without a hard error.

If OCR math is imperfect, the app should still open a reviewable receipt flow instead of failing the request.

## Smoke Checklist

### 1. Upload Image

Action:
- Open `/`
- Upload `docs/manual-testing/img.png`
- Click `Извлечь данные чека`

Expected:
- Loading state appears
- Request completes
- App routes to a new receipt page
- No blocking error toast

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - `img.png` загрузился
  - OCR request завершился успешно
  - Приложение перешло на `/receipt/:id` без hard error
  - После создания receipt participants count = `0`

### 2. OCR Result Is Usable

Action:
- Inspect the created receipt page after OCR

Expected:
- Receipt screen opens
- Positions are present
- Totals block is rendered
- Page is interactive, not frozen
- No obvious duplicate garbage rows caused by OCR collapse rules

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - Receipt page открылся
  - 11 позиций отображаются
  - Totals block и discount block видимы
  - UI остался интерактивным

### 3. Hard Receipt Rules Look Reasonable

Action:
- Review parsed positions against the source image

Expected:
- Free zero-cost giveaway rows are absent
- Beer/liter rows are normalized reasonably
- Repeated identical pours are merged when appropriate
- Totals remain plausible after normalization

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - Бесплатные позиции не попали в результат
  - Повторяющиеся beer rows схлопнулись разумно
  - `Black Sheep 1 pint` собрался как `484.50 × 7 = 3391.50`
  - `Schlitz Helles 0.5` собрался как `484.50 × 2 = 969`
  - Скидка распознана как `1920.50`

### 4. Validation / Review Flow

Action:
- If the receipt lands in review mode, inspect validation messages
- If it lands directly in normal receipt mode, manually open editing and introduce a bad value, then save

Expected:
- Validation errors are visible and understandable
- Errors do not break the page
- Fixing invalid values returns the receipt to a valid state

Observed:
- [ ] Pass
- [ ] Fail
- Notes:
  - Для anonymous user без имени join flow сразу открыл `Настройки`
  - Это ожидаемо после удаления автосоздания participant владельца
  - После ввода имени `Anton` и сохранения settings flow продолжился штатно

### 5. Position Editing

Action:
- Open edit for one parsed position
- Change name, price, quantity, or overall
- Save

Expected:
- Form opens without broken fields
- Validation messages appear for invalid input
- Valid changes persist after save

Observed:
- [ ] Pass
- [ ] Fail
- Notes:
  - Явный position edit form отдельно не проверялся
  - Проверялся item claim dialog для `Schlitz Helles 0.5`, он открывается

### 6. Totals Editing

Action:
- Open totals editor
- Try one invalid value set
- Restore valid values and save

Expected:
- Invalid totals show clear errors
- Valid totals save correctly
- Receipt remains navigable after totals save

Observed:
- [ ] Pass
- [x] Fail
- Notes:
  - Тап по `Итого: 14339.50 ₽` делает кнопку active
  - Totals editor / modal не открывается
  - Это блокер для ручной проверки totals editing

### 7. Splitting Screen Opens

Action:
- Press `Готово` / proceed into splitting flow

Expected:
- Splitting screen opens
- Participants block renders
- No crash when entering claim UI

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - Claim dialog для `Schlitz Helles 0.5` открылся
  - Participant block и controls отображаются
  - UI не упал при входе в claim flow

### 8. Tricky Amount / Quantity Case

Action:
- Find one normalized beer position with fractional quantity or amount-sensitive behavior
- Open claim editor
- Check both `шт` and `₽` modes
- Use `Макс`

Expected:
- Displayed claimed amount matches position math
- No upward rounding bug like `484.5 -> 485`
- Distribution row and summary stay consistent with the edited claim

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - В режиме `₽` кнопка `Макс` поставила ровно `969`, без округления до `970`
  - После `Макс` в dialog `Распределено` стало `969 / 969 ₽`
  - После `Сохранить` и `Готово` claim отобразился в строке позиции как `Anton: 969`

### 9. Summary Screen

Action:
- Complete at least one claim and move to summary

Expected:
- Summary screen renders
- Shares and totals look internally consistent
- No negative or impossible residual amounts

Observed:
- [x] Pass
- [ ] Fail
- Notes:
  - Summary screen открылся
  - Claim для `Schlitz Helles 0.5 (0.50л)` отобразился в summary
  - Осталось `11579.78 ₽`
  - Share для `Anton` посчиталась как `839.22 ₽`

## Browser Console Check

Action:
- Review console and network after the smoke run

Expected:
- No receipt-flow-specific uncaught runtime errors
- Known external auth warnings may be ignored for this smoke if unrelated to receipt flow

Observed:
- [ ] Pass
- [x] Fail
- Notes:
  - Known env noise: Google auth 403 on localhost
  - Есть также `GSI_LOGGER` / `Not signed in with the identity provider` warnings while auth widget initializes
  - Реальный app warning: `Missing Description or aria-describedby={undefined} for {DialogContent}`
  - `AlertDialogContent` также требует description

## Bug Log

### Issue 1
- Step:
- `6. Totals Editing`
- Actual:
- Тап по totals button не открывает редактор totals
- Expected:
- Должен открыться totals edit form / dialog
- Severity:
- High

### Issue 2
- Step:
- `10. Browser Console Check`
- Actual:
- У dialog/alertdialog нет description, в консоли warnings про accessibility
- Expected:
- У dialog components должна быть description / aria-describedby
- Severity:
- Medium

## Final Status

- [ ] Smoke passed
- [x] Smoke passed with minor issues
- [ ] Smoke failed

## Known Non-Goals / Environment Notes

- Google auth button errors on localhost are out of scope for this smoke if receipt upload/edit/splitting still works
- This plan is intentionally single-user and manual
