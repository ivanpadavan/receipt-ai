// Default language is Russian
const ru = {
  // ReceiptForm column headers
  name: 'Наименование',
  price: 'Цена',
  quantity: 'Количество',
  overall: 'Сумма',

  // ReceiptForm footer labels
  total: 'Итого:',
  totalWithDiscountsAndAdditions: 'С учетом скидок и сборов:',

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
  totalWithDiscountsAndAdditions: 'Total with discounts and additions:',

  // Modifiers section titles
  discounts: 'Discounts',
  additions: 'Additions',

  // Modifiers field labels
  modifierName: 'Name',
  modifierValue: 'Value',

  // Form edit modal
  save: 'Save',
  saving: 'Saving...',
  cancel: 'Cancel',
  value: 'Value',
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
