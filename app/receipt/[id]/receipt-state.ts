import { FormArray } from "@/forms/form_array";
import { FormControl } from "@/forms/form_control";
import { FormGroup } from "@/forms/form_group";
import { InferForm } from "@/forms/type";
import { ValidatorFn } from "@/forms/validators";
import { Observable, of } from "rxjs";
import { TranslationKey } from "@/app/i18n/translations";
import {
  Receipt, validateReceipt, calculatePositionsTotal, calculateTotal
} from "@/model/receipt/model";
import {
  stringNotEmpty,
  numberMoreThenZero,
  overallMatchesQuantityPrice,
  positionsTotalMatchesSum,
  totalMatchesCalculation
} from "./validators";

type FormType = 'validation' | 'editing' | 'quantities';

export type ReceiptForm = InferForm<Receipt>;

export type PositionForm = ReceiptForm['controls']['positions']['controls'][0];

export type ModifierForm = ReceiptForm['controls']['total']['controls']['additions'] | ReceiptForm['controls']['total']['controls']['discounts'];

export type AppendableForm = PositionForm | ModifierForm;

export interface EditModalProps {
  formGroup: AppendableForm;
  onFinish: () => void;
  remove?: () => void;
  header: TranslationKey;
}

export type FormScenario = { type: FormType; form: ReceiptForm }

export type ReceiptState = {
  scenario: FormScenario;
  openEditModal: (v: AppendableForm | 'addPosition' | 'addDiscount' | 'addFee') => void,
  proceed: () => void;
};

export const receiptFormState$ = (initialData: Receipt, openEditModal: (v: EditModalProps) => void): Observable<ReceiptState> => {
  const type = validateReceipt(initialData).isValid ? 'editing' as const : 'validation' as const;

  const positionCalculator = type === 'validation'
    ? () => null
    : (form: PositionForm) => {
      if (Object.keys(form.controls).length !== 4) {
        return null;
      }
      const { quantity, price } = form.getRawValue();
      form.controls.overall.patchValue(quantity * price, { onlySelf: true });
      return null;
    }

  const formCalculator = type === 'validation'
    ? () => null
    : (form: ReceiptForm) => {
      const { positionsTotal, total } = form.controls.total.controls;
      positionsTotal.patchValue(calculatePositionsTotal(form.getRawValue().positions), { onlySelf: true });
      total.patchValue(calculateTotal(form.getRawValue()), { onlySelf: true });
      return null;
    }

  // Default position form group for adding new positions
  const defaultPosition = (): PositionForm => {
    const result = new FormGroup({
      name: new FormControl('', {
        validators: [stringNotEmpty]
      }),
      price: new FormControl(0, {
        validators: [numberMoreThenZero]
      }),
      quantity: new FormControl(0, {
        validators: [numberMoreThenZero]
      }),
      overall: new FormControl(0, {
        validators: [overallMatchesQuantityPrice],
      })
    }, { validators: [positionCalculator as ValidatorFn] });

    if (type === 'editing') {
      result.controls.overall.disable();
    }

    return result;
  };

  // Default modifier form group for adding new modifiers
  const defaultModifier = (): ModifierForm['controls'][number] => {
    return new FormGroup({
      name: new FormControl('', {
        validators: [stringNotEmpty]
      }),
      value: new FormControl(0, {
        validators: [numberMoreThenZero]
      })
    });
  };

  // Create the form with validation
  const form: ReceiptForm = new FormGroup({
    positions: new FormArray(initialData.positions.map(defaultPosition)),
    total: new FormGroup({
      positionsTotal: new FormControl(initialData.total.positionsTotal, {
        validators: [positionsTotalMatchesSum]
      }),
      total: new FormControl(initialData.total.total, {
        validators: [totalMatchesCalculation]
      }),
      additions: new FormArray(initialData.total.additions.map(defaultModifier)),
      discounts: new FormArray(initialData.total.discounts.map(defaultModifier))
    })
  });

  form.addValidators(formCalculator as ValidatorFn);

  if (type === 'editing') {
    form.controls.total.controls.total.disable();
    form.controls.total.controls.positionsTotal.disable();
  }

  // Initialize the form with the initial data
  form.patchValue(initialData, {emitEvent: false});
  form.patchValue(initialData, {emitEvent: false});

  const state: ReceiptState = {
    scenario: { type, form },
    proceed: () => void 0,
    openEditModal: (args) => {
      // Handle the case where args is an object with a type property
      const formToEdit = args instanceof Object && 'type' in args ? args.type : args;

      if (formToEdit instanceof FormGroup) {
        const parent = formToEdit.parent as FormArray<AppendableForm>;
        const idx = parent.controls.findIndex(form => form === formToEdit);
        const isPosition = 'overall' in formToEdit.controls;
        const newForm = (isPosition ? defaultPosition() : defaultModifier()) as any;
        const isDiscount = !isPosition && parent.parent?.get('discounts') == parent;
        newForm.patchValue(formToEdit.getRawValue());
        openEditModal({
          formGroup: newForm,
          onFinish: () => parent.controls.at(idx)?.patchValue(newForm.getRawValue() as any),
          remove: () => parent.removeAt(idx),
          header: isPosition ? 'editPosition' : isDiscount ? 'editDiscount' : 'editFee',
        });
      } else if (formToEdit === 'addPosition') {
        const newPosition = defaultPosition();
        openEditModal({
          formGroup: newPosition,
          onFinish: () => form.controls.positions.insert(0, newPosition),
          header: 'addPosition'
        });
      } else {
        const newModifier = defaultModifier();
        const isAddition = formToEdit === 'addFee';
        const header = isAddition ? 'addFee' : 'addDiscount';
        openEditModal({
          formGroup: newModifier as any,
          onFinish: () => {
            const groupName = isAddition ? 'additions' : 'discounts';
            form.controls.total.controls[groupName].insert(0, newModifier);
          },
          header: header
        });
      }
    },
  }

  return of(state);
};
