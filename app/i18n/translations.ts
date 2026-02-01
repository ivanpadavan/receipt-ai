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
