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

  // Modifiers section titles
  discounts: 'Скидки',
  additions: 'Сборы',

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

  // Modifiers section titles
  discounts: 'Discounts',
  additions: 'Fees',

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
