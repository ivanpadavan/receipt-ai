// Default language is Russian
const ru = {
  // ReceiptForm column headers
  name: 'Наименование',
  price: 'Цена',
  quantity: 'Количество',
  overall: 'Сумма',

  // ReceiptForm footer labels
  total: 'Итого:',
  grandTotal: 'С учетом скидок и сборов:',
  proceed: 'Продолжить',

  // Modifiers section titles
  discounts: 'Скидки',
  fees: 'Сборы',

  // Modifiers field labels
  modifierName: 'Название',
  modifierValue: 'Сумма',

  // Form edit modal
  save: 'Сохранить',
  saving: 'Сохранение...',
  cancel: 'Отмена',
  value: 'Значение',
  remove: 'Удалить',
  editPosition: 'Редактировать позицию',
  addPosition: 'Добавить позицию',
  addDiscount: 'Добавить скидку',
  editDiscount: 'Редактировать скидку',
  addFee: 'Добавить сбор',
  editFee: 'Редактировать сбор',
  warning: 'Предупреждение',
  error: 'Ошибка',
  close: 'Закрыть',
  useServer: 'Принять серверное',
  keepMine: 'Оставить моё',

  // Splitting mode
  splitEvenly: 'Поделить поровну',
  addMore: 'Добавить ещё',
  amount: 'Сумма',
  pcs: 'шт',
  participants: 'Участники',
  addParticipant: 'Добавить участника',
  toSummary: 'К итогам',
  share: 'Поделиться',
  yourShare: 'Ваша доля',
  unclaimed: 'Не распределено',
  distribution: 'Распределено',
  back: 'Назад',
  distributed: 'Распределено',
  done: 'Готово',

  // Delete confirmation
  deleteParticipant: 'Удалить участника?',
  deleteParticipantConfirm: 'Вы уверены, что хотите удалить этого участника? Все его распределения по позициям будут сброшены.',
  delete: 'Удалить',

  // Navigation
  edit: 'Редактировать',
  addShare: 'Добавить долю',
  receipt: 'Чек',
  remaining: 'Осталось',
  overpaid: 'Переплата',
  copiedToClipboard: 'Скопировано в буфер',
  noClaims: 'Пока нет распределений',
};

export type TranslationKey = keyof typeof ru;
export type Translations = Record<TranslationKey, string>;

// English translations
const en: Translations = {
  // ReceiptForm column headers
  name: 'Name',
  price: 'Price',
  quantity: 'Quantity',
  overall: 'Total',

  // ReceiptForm footer labels
  total: 'Total:',
  grandTotal: 'Grand Total:',
  proceed: 'Proceed',

  // Modifiers section titles
  discounts: 'Discounts',
  fees: 'Fees',

  // Modifiers field labels
  modifierName: 'Name',
  modifierValue: 'Value',

  // Form edit modal
  save: 'Save',
  saving: 'Saving...',
  cancel: 'Cancel',
  value: 'Value',
  remove: 'Remove',
  editPosition: 'Edit Item',
  addPosition: 'Add Item',
  addDiscount: 'Add Discount',
  editDiscount: 'Edit Discount',
  addFee: 'Add Fee',
  editFee: 'Edit Fee',
  warning: 'Warning',
  error: 'Error',
  close: 'Close',
  useServer: 'Use server',
  keepMine: 'Keep mine',

  // Splitting mode
  splitEvenly: 'Split evenly',
  addMore: 'Add more',
  amount: 'Amount',
  pcs: 'pcs',
  participants: 'Participants',
  addParticipant: 'Add participant',
  toSummary: 'To Summary',
  share: 'Share',
  yourShare: 'Your share',
  unclaimed: 'Unclaimed',
  distribution: 'Distribution',
  back: 'Back',
  distributed: 'Distributed',
  done: 'Done',

  // Delete confirmation
  deleteParticipant: 'Delete participant?',
  deleteParticipantConfirm: 'Are you sure you want to delete this participant? All their claim distributions will be reset.',
  delete: 'Delete',

  // Navigation
  edit: 'Edit',
  addShare: 'Add share',
  receipt: 'Receipt',
  remaining: 'Remaining',
  overpaid: 'Overpaid',
  copiedToClipboard: 'Copied to clipboard',
  noClaims: 'No claims yet',
};

// Available languages
export const languages = {
  ru,
  en,
};

// Current language (could be set based on user preferences or browser settings)
export const currentLanguage = 'ru';

// Function to get a translation
export function t(key: keyof Translations): string {
  return languages[currentLanguage as keyof typeof languages][key] || key;
}
