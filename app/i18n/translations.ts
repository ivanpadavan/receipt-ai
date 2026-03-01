// Default language is Russian
const ru = {
  // ReceiptForm column headers
  name: "Наименование",
  price: "Цена",
  quantity: "Количество",
  overall: "Сумма",

  // ReceiptForm footer labels
  total: "Итого:",
  grandTotal: "С учетом скидок и сборов:",
  proceed: "Продолжить",
  toSplitting: "Распределить",

  // Modifiers section titles
  discounts: "Скидки",
  fees: "Сборы",

  // Modifiers field labels
  modifierName: "Название",
  modifierValue: "Сумма",

  // Form edit modal
  save: "Сохранить",
  saving: "Сохранение...",
  cancel: "Отмена",
  value: "Значение",
  remove: "Удалить",
  editPosition: "Редактировать позицию",
  addPosition: "Добавить позицию",
  addDiscount: "Добавить скидку",
  editDiscount: "Редактировать скидку",
  addFee: "Добавить сбор",
  editFee: "Редактировать сбор",
  warning: "Предупреждение",
  error: "Ошибка",
  close: "Закрыть",
  useServer: "Принять серверное",
  keepMine: "Оставить моё",

  // Splitting mode
  splitEvenly: "Поделить поровну",
  addMore: "Добавить ещё",
  amount: "Сумма",
  pcs: "шт",
  participants: "Участники",
  splitBetween: "Разделить между",
  selectAll: "Выбрать всех",
  clearAll: "Снять всех",
  max: "Макс",
  online: "Онлайн",
  offline: "Не в сети",
  addParticipant: "Добавить участника",
  toSummary: "К итогам",
  share: "Поделиться",
  yourShare: "Ваша доля",
  unclaimed: "Не распределено",
  distribution: "Распределено",
  back: "Назад",
  distributed: "Распределено",
  done: "Готово",

  // Delete confirmation
  deleteParticipant: "Удалить участника?",
  deleteParticipantConfirm:
    "Вы уверены, что хотите удалить этого участника? Все его распределения по позициям будут сброшены.",
  delete: "Удалить",

  // Navigation
  edit: "Редактировать",
  addShare: "Добавить долю",
  receipt: "Чек",
  remaining: "Осталось",
  overpaid: "Переплата",
  copiedToClipboard: "Скопировано в буфер",
  noClaims: "Пока нет распределений",
  settings: "Настройки",
  profileName: "Имя",
  avatarImage: "Аватар",
  avatarUrl: "Ссылка на аватар",
  uploadAvatar: "Загрузить аватар",
  changeAvatar: "Сменить аватар",
  avatarUploadHint: "Нажмите, чтобы выбрать файл или сделать фото",
  takeAvatarPhoto: "Сделать фото",
  cropAvatar: "Обрезать аватар",
  zoom: "Масштаб",
  yourName: "Ваше имя",
  alreadyParticipated: "Вы уже участвовали?",
  removedTitle: "Вы удалены из чека",
  removedBody: "У вас больше нет доступа к этому чеку.",
  goHome: "На главную",
  nameConflict: "Совпадает имя",
  copyLink: "Скопировать ссылку",
  shareReceiptTitle: "Поделиться чеком",
  shareReceiptHint: "Отсканируйте QR-код или отправьте ссылку.",
  shareReceiptQrAlt: "QR-код ссылки на чек",
  shareViaSystem: "Поделиться",
  sseDisconnected: "Потеряно соединение с сервером",
  sseReconnected: "Соединение восстановлено",
  receiptNeedsReview:
    "Чек распознан не полностью. Проверьте и исправьте данные перед распределением.",
  receiptScannerTitle: "Сканер чеков",
  receiptImageAlt: "Изображение чека",
  clearImage: "Очистить изображение",
  extractReceiptData: "Извлечь данные чека",
  uploadReceiptImage: "Загрузите изображение чека",
  tapToSelectOrPaste: "Нажмите, чтобы выбрать из галереи или вставить из буфера",
  selectImageFileError: "Выберите файл изображения",
  fileReadError: "Не удалось прочитать файл. Попробуйте снова.",
  processingReceipt: "Обработка чека...",
  errorLabel: "Ошибка:",
  receiptHistory: "История чеков",
  noReceiptsYet: "Вы еще не сканировали чеки.",
  scanFirstReceipt: "Сканировать первый чек",
  itemSingle: "позиция",
  itemPlural: "позиций",
  receiptNotFound: "Чек не найден",
  receiptNotFoundBody:
    "Чек не существует или у вас нет прав на его просмотр.",
  returnHome: "Вернуться на главную",
  participantsEmpty: "Добавьте участников чека",
  newParticipantNamePlaceholder: "Имя нового участника",
  scanNew: "Сканировать",
  history: "История",
  signOut: "Выйти",
  genericTryAgain: "Что-то пошло не так. Попробуйте еще раз.",
  genericTryAgainLater: "Что-то пошло не так. Попробуйте позже.",
  validationNameRequired: "Название не должно быть пустым",
  validationPricePositive: "Цена должна быть больше 0",
  validationQuantityPositive: "Количество должно быть больше 0",
  validationOverallPositive: "Сумма должна быть больше 0",
  validationOverallMatchesQuantityPrice:
    "Сумма должна совпадать с цена × количество",
  validationModifierValuePositive: "Значение должно быть больше 0",
  validationTotalPositive: "Итог должен быть больше 0",
  validationGrandTotalPositive: "Итог с учетом скидок и сборов должен быть больше 0",
  validationTotalMismatchPrefix: "Итог",
  validationTotalMismatchSuffix: "не совпадает с суммой позиций",
  validationGrandTotalExpectedPrefix: "С учетом скидок и сборов должно быть",
  validationClaimedQuantityExceeds:
    "Распределенное количество больше количества позиции",
  validationClaimedAmountExceeds: "Распределенная сумма больше суммы позиции",
  validationFinalGrandTotalMismatchPrefix:
    "Итог с учетом скидок и сборов",
  validationFinalGrandTotalMismatchSuffix: "не совпадает с расчетным значением",
};

export type TranslationKey = keyof typeof ru;
export type Translations = Record<TranslationKey, string>;

// English translations
const en: Translations = {
  // ReceiptForm column headers
  name: "Name",
  price: "Price",
  quantity: "Quantity",
  overall: "Total",

  // ReceiptForm footer labels
  total: "Total:",
  grandTotal: "Grand Total:",
  proceed: "Proceed",
  toSplitting: "Split",

  // Modifiers section titles
  discounts: "Discounts",
  fees: "Fees",

  // Modifiers field labels
  modifierName: "Name",
  modifierValue: "Value",

  // Form edit modal
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  value: "Value",
  remove: "Remove",
  editPosition: "Edit Item",
  addPosition: "Add Item",
  addDiscount: "Add Discount",
  editDiscount: "Edit Discount",
  addFee: "Add Fee",
  editFee: "Edit Fee",
  warning: "Warning",
  error: "Error",
  close: "Close",
  useServer: "Use server",
  keepMine: "Keep mine",

  // Splitting mode
  splitEvenly: "Split evenly",
  addMore: "Add more",
  amount: "Amount",
  pcs: "pcs",
  participants: "Participants",
  splitBetween: "Share between",
  selectAll: "Select all",
  clearAll: "Clear all",
  max: "Max",
  online: "Online",
  offline: "Offline",
  addParticipant: "Add participant",
  toSummary: "To Summary",
  share: "Share",
  yourShare: "Your share",
  unclaimed: "Unclaimed",
  distribution: "Distribution",
  back: "Back",
  distributed: "Distributed",
  done: "Done",

  // Delete confirmation
  deleteParticipant: "Delete participant?",
  deleteParticipantConfirm:
    "Are you sure you want to delete this participant? All their claim distributions will be reset.",
  delete: "Delete",

  // Navigation
  edit: "Edit",
  addShare: "Add share",
  receipt: "Receipt",
  remaining: "Remaining",
  overpaid: "Overpaid",
  copiedToClipboard: "Copied to clipboard",
  noClaims: "No claims yet",
  settings: "Settings",
  profileName: "Name",
  avatarImage: "Avatar image",
  avatarUrl: "Avatar URL",
  uploadAvatar: "Upload avatar",
  changeAvatar: "Change avatar",
  avatarUploadHint: "Click to choose a file or take a photo",
  takeAvatarPhoto: "Take photo",
  cropAvatar: "Crop avatar",
  zoom: "Zoom",
  yourName: "Your name",
  alreadyParticipated: "Did you already participate?",
  removedTitle: "Removed from receipt",
  removedBody: "You no longer have access to this receipt.",
  goHome: "Go home",
  nameConflict: "Name already exists",
  copyLink: "Copy link",
  shareReceiptTitle: "Share receipt",
  shareReceiptHint: "Scan the QR code or send the link.",
  shareReceiptQrAlt: "Receipt link QR code",
  shareViaSystem: "Share",
  sseDisconnected: "Connection to server lost",
  sseReconnected: "Connection restored",
  receiptNeedsReview:
    "Receipt was parsed partially. Please review and fix values before splitting.",
  receiptScannerTitle: "Receipt Scanner",
  receiptImageAlt: "Receipt image",
  clearImage: "Clear image",
  extractReceiptData: "Extract receipt data",
  uploadReceiptImage: "Upload receipt image",
  tapToSelectOrPaste: "Tap to select from gallery or paste from clipboard",
  selectImageFileError: "Please select an image file",
  fileReadError: "Could not read the file. Please try again.",
  processingReceipt: "Processing receipt...",
  errorLabel: "Error:",
  receiptHistory: "Receipt History",
  noReceiptsYet: "You haven't scanned any receipts yet.",
  scanFirstReceipt: "Scan your first receipt",
  itemSingle: "item",
  itemPlural: "items",
  receiptNotFound: "Receipt not found",
  receiptNotFoundBody:
    "The receipt you are looking for does not exist or you do not have permission to view it.",
  returnHome: "Return to home",
  participantsEmpty: "Add receipt participants",
  newParticipantNamePlaceholder: "New participant name",
  scanNew: "Scan new",
  history: "History",
  signOut: "Sign out",
  genericTryAgain: "Something went wrong. Please try again.",
  genericTryAgainLater: "Something went wrong. Please try again later.",
  validationNameRequired: "Name should not be empty",
  validationPricePositive: "Price should be greater than 0",
  validationQuantityPositive: "Quantity should be greater than 0",
  validationOverallPositive: "Overall should be greater than 0",
  validationOverallMatchesQuantityPrice:
    "Overall should match quantity × price",
  validationModifierValuePositive: "Value should be greater than 0",
  validationTotalPositive: "Total should be greater than 0",
  validationGrandTotalPositive: "Grand total should be greater than 0",
  validationTotalMismatchPrefix: "Total",
  validationTotalMismatchSuffix: "doesn't match positions sum",
  validationGrandTotalExpectedPrefix: "Grand total should be",
  validationClaimedQuantityExceeds:
    "Claimed quantity is greater than position quantity",
  validationClaimedAmountExceeds: "Claimed amount is greater than position total",
  validationFinalGrandTotalMismatchPrefix: "Final grand total",
  validationFinalGrandTotalMismatchSuffix:
    "doesn't match calculated value",
};

// Available languages
export const languages = {
  ru,
  en,
};

// Current language (could be set based on user preferences or browser settings)
export const currentLanguage = "ru";

// Function to get a translation
export function t(key: keyof Translations): string {
  return languages[currentLanguage as keyof typeof languages][key] || key;
}
