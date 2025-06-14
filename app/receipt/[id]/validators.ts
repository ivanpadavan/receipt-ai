import { AbstractControl } from "@/forms/abstract_model";
import { FormArray } from "@/forms/form_array";
import { calculatePositionsTotal, sumModifiers } from "@/model/receipt/model";

// Validators
export const stringNotEmpty = (control: AbstractControl<string>) =>
  control.value.length === 0 ? { stringEmpty: 'should not be empty' } : null;

export const numberMoreThenZero = (control: AbstractControl<number>) =>
  (control.value <= 0 || isNaN(control.value)) ? { valueZero: 'should not be equal or below zero' } : null;

export const overallMatchesQuantityPrice = (control: AbstractControl) => {
  const parent = control.parent;
  if (!parent) return null;

  const quantity = parent.get('quantity')?.value || 0;
  const price = parent.get('price')?.value || 0;
  const calculatedOverall = quantity * price;

  return Math.abs(calculatedOverall - control.value) > 0.01
    ? { overallMismatch: `Overall value ${control.value} doesn't match quantity * price (${quantity} * ${price} = ${calculatedOverall})` }
    : null;
};

export const positionsTotalMatchesSum = (control: AbstractControl) => {
  const parent = control.parent?.parent;
  if (!parent) return null;

  const positionsArray = parent.get('positions') as FormArray;
  if (!positionsArray) return null;

  const positions = positionsArray.controls.map(control => ({
    name: control.get('name')?.value || '',
    quantity: control.get('quantity')?.value || 0,
    price: control.get('price')?.value || 0,
    overall: control.get('overall')?.value || 0
  }));

  const calculatedPositionsTotal = calculatePositionsTotal(positions);

  return Math.abs(calculatedPositionsTotal - control.value) > 0.01
    ? { positionsTotalMismatch: `Positions total ${control.value} doesn't match the sum of all position overall values (${calculatedPositionsTotal})` }
    : null;
};

export const totalMatchesCalculation = (control: AbstractControl) => {
  const parent = control.parent;
  if (!parent) return null;

  const positionsTotal = parent.get('positionsTotal')?.value || 0;

  const additionsArray = parent.get('additions') as FormArray;
  const additions = additionsArray.controls.map(control => ({
    name: control.get('name')?.value || '',
    value: control.get('value')?.value || 0
  }));

  const discountsArray = parent.get('discounts') as FormArray;
  const discounts = discountsArray.controls.map(control => ({
    name: control.get('name')?.value || '',
    value: control.get('value')?.value || 0
  }));

  const additionsSum = sumModifiers(additions);
  const discountsSum = sumModifiers(discounts);
  const calculatedTotal = positionsTotal + additionsSum - discountsSum;

  return Math.abs(calculatedTotal - control.value) > 0.01
    ? { totalMismatch: `Final total ${control.value} doesn't match positionsTotal + additions - discounts (${positionsTotal} + ${additionsSum} - ${discountsSum} = ${calculatedTotal})` }
    : null;
};
