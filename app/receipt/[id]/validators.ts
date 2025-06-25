import { PositionForm, ReceiptForm } from "@/app/receipt/[id]/receipt-state";
import { AbstractControl } from "@/forms/abstract_model";
import { calculateTotal, sumModifiers } from "@/model/receipt/model";

// Validators
export const stringNotEmpty = (control: AbstractControl<string>) =>
  control.value.length === 0 ? { stringEmpty: 'should not be empty' } : null;

export const numberMoreThenZero = (control: AbstractControl<number>) =>
  (control.value <= 0 || isNaN(control.value)) ? { valueZero: 'should not be equal or below zero' } : null;

export const overallMatchesQuantityPrice = (control: AbstractControl) => {
  const parent = control.parent as PositionForm;
  if (!parent) return null;

  const quantity = parent.controls.quantity.value;
  const price = parent.controls.price.value;
  const calculatedOverall = quantity * price;

  return Math.abs(calculatedOverall - control.value) > 0.01
    ? { overallMismatch: `Overall value ${control.value} doesn't match quantity * price (${quantity} * ${price} = ${calculatedOverall})` }
    : null;
};

export const positionsTotalMatchesSum = (control: AbstractControl) => {
  const parent = control.parent?.parent as ReceiptForm;
  if (!parent) return null;

  const positionsArray = parent.controls.positions;
  if (!positionsArray) return null;

  const positions = positionsArray.getRawValue();

  const calculatedTotal = calculateTotal(positions);

  return Math.abs(calculatedTotal - control.value) > 0.01
    ? { totalMismatch: `Total ${control.value} doesn't match the sum of all position overall values (${calculatedTotal})` }
    : null;
};

export const totalMatchesCalculation = (control: AbstractControl) => {
  const parent = control.parent?.parent?.parent as ReceiptForm;
  if (!parent) return null;

  const total = parent.controls.total.controls.totals.controls.total.value || 0;

  const feesArray = parent.controls.total.controls.fees;
  const fees = feesArray.controls.map(control => ({
    name: control.controls.name.value || '',
    value: control.controls.value.value || 0
  }));

  const discountsArray = parent.controls.total.controls.discounts;
  const discounts = discountsArray.controls.map(control => ({
    name: control.controls.name.value || '',
    value: control.controls.value.value || 0
  }));

  const feesSum = sumModifiers(fees);
  const discountsSum = sumModifiers(discounts);
  const calculatedGrandTotal = total + feesSum - discountsSum;

  return Math.abs(calculatedGrandTotal - control.value) > 0.01
    ? { grandTotalMismatch: `Final grand total ${control.value} doesn't match total + fees - discounts (${total} + ${feesSum} - ${discountsSum} = ${calculatedGrandTotal})` }
    : null;
};
