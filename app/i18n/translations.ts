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
  authPromptTitle: "Нужна авторизация?",
  authPromptBody:
    "Вы можете авторизоваться или продолжить анонимно. В любом случае потребуется имя.",
  continueAnon: "Продолжить анонимно",
  authYes: "Авторизоваться",
  removedTitle: "Вы удалены из чека",
  removedBody: "У вас больше нет доступа к этому чеку.",
  goHome: "На главную",
  nameConflict: "Совпадает имя",
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
  authPromptTitle: "Sign in?",
  authPromptBody:
    "You can sign in or continue anonymously. Name is required in both cases.",
  continueAnon: "Continue anonymously",
  authYes: "Sign in",
  removedTitle: "Removed from receipt",
  removedBody: "You no longer have access to this receipt.",
  goHome: "Go home",
  nameConflict: "Name already exists",
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
