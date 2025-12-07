import { FormArray } from "@/forms/form_array";
import { FormControl } from "@/forms/form_control";
import { FormGroup } from "@/forms/form_group";
import { InferForm } from "@/forms/type";
import { ValidatorFn } from "@/forms/validators";
import {
  concat,
  defer,
  EMPTY,
  ignoreElements,
  merge,
  Observable,
  of,
  Subject,
  switchMap,
} from "rxjs";
import { TranslationKey } from "@/app/i18n/translations";
import {
  Receipt, validateReceipt, calculateTotal, calculateGrandTotal
} from "@/model/receipt/model";
import { map, tap } from "rxjs/operators";
import {
  stringNotEmpty,
  numberMoreThenZero,
  overallMatchesQuantityPrice,
  positionsTotalMatchesSum as totalMatchesSum,
  totalMatchesCalculation as grandTotalMatchesCalculation
} from "./validators";
import { apiClient } from "@/app/api-client";

type FormType = 'validation' | 'editing' | 'splitting';

export type ReceiptForm = InferForm<Receipt>;

export type PositionForm = ReceiptForm['controls']['positions']['controls'][0];

export type ModifierForm = ReceiptForm['controls']['fees'] | ReceiptForm['controls']['discounts'];

export type TotalsForm = ReceiptForm['controls']['totals'];

export type AppendableForm = PositionForm | ModifierForm | TotalsForm;

export interface EditModalProps {
  formGroup: AppendableForm;
  initialValue?: ReturnType<AppendableForm['getRawValue']>;
  onFinish: (form: ReceiptForm) => void;
  remove?: (form: ReceiptForm) => void;
  header: TranslationKey;
}

export type CanEdit = {
  positionForm: boolean | 'splitting',
  modifierForm: boolean,
  totalsForm: boolean,
}

export type FormScenario = { type: FormType; canEdit: CanEdit, form: ReceiptForm }

export type ReceiptState = {
  scenario: FormScenario;
  openEditModal: (v: AppendableForm | 'addPosition' | 'addDiscount' | 'addFee') => void,
  proceed: () => void;
  canProceed$: Observable<boolean>;
  openEditModalCommand$: Observable<EditModalProps>;
};

const permissions: Record<FormType, CanEdit> = {
  validation: {
    positionForm: true,
    modifierForm: true,
    totalsForm: true,
  },
  editing: {
    positionForm: true,
    modifierForm: true,
    totalsForm: false,
  },
  splitting: {
    positionForm: 'splitting',
    modifierForm: false,
    totalsForm: false,
  }
}

export const receiptFormState$ = (
  initialData: Receipt,
  receiptId: string = '',
): Observable<ReceiptState> => {
  const openEditModalCommand$ = new Subject<EditModalProps>();

  const type = validateReceipt(initialData).isValid ? 'editing' as const : 'validation' as const;

  const positionCalculator = type === 'validation'
    ? (form: PositionForm) => {
      form.controls.overall.updateValueAndValidity({ onlySelf: true });
      return null;
    }
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
      const { total, grandTotal } = form.controls.totals.controls;
      total.patchValue(calculateTotal(form.getRawValue().positions), { onlySelf: true });
      grandTotal.patchValue(calculateGrandTotal(form.getRawValue()), { onlySelf: true });
      return null;
    }

  // Default position form group for adding new positions
  const defaultPosition = (): PositionForm => {
    const result = new FormGroup({
      id: new FormControl(crypto.randomUUID()),
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
      id: new FormControl(crypto.randomUUID()),
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
    totals: new FormGroup({
      total: new FormControl(initialData.totals.total, {
        validators: [totalMatchesSum]
      }),
      grandTotal: new FormControl(initialData.totals.grandTotal, {
        validators: [grandTotalMatchesCalculation]
      })
    }),
    fees: new FormArray(initialData.fees.map(defaultModifier)),
    discounts: new FormArray(initialData.discounts.map(defaultModifier))
  });

  form.addValidators(formCalculator as ValidatorFn);

  const updateForm$ = defer(() => apiClient.updateReceipt({ id: receiptId, data: form.getRawValue() }))

  let effect$ = EMPTY;

  if (type === 'editing') {
    form.controls.totals.controls.grandTotal.disable();
    form.controls.totals.controls.total.disable();
    effect$ = form.value$.pipe(
      switchMap(() => updateForm$),
      ignoreElements(),
    );
  } else if (type === 'validation') {
    effect$ = form.value$.pipe(
      switchMap(() => {
        const { grandTotal, total } = form.controls.totals.controls;
        [grandTotal, total].forEach(control => control.updateValueAndValidity({ onlySelf: true }));

        return updateForm$;
      }),
      ignoreElements()
    );
  }

  // Initialize the form with the initial data
  form.patchValue(initialData, { emitEvent: false });
  form.patchValue(initialData, { emitEvent: false });

  const proceed$ = new Subject<void>();

  const state: ReceiptState = {
    openEditModalCommand$,
    scenario: { type, form, canEdit: permissions[type] },
    canProceed$: form.value$.pipe(map(() => form.valid)),
    proceed: () => proceed$.next(),
    openEditModal: (args) => {
      const formToEdit = typeof args === 'object' && 'type' in args ? args.type : args;

      if (formToEdit instanceof FormGroup) {
        if (formToEdit.parent instanceof FormArray) {
          const parent = formToEdit.parent as FormArray<AppendableForm>;
          const isPosition = 'overall' in formToEdit.controls;
          const newForm = (isPosition ? defaultPosition() : defaultModifier()) as any;
          const isDiscount = !isPosition && parent.parent?.get('discounts') == parent;
          const initialValue = formToEdit.getRawValue();
          newForm.patchValue(initialValue);
          const path = isPosition ? 'positions' : isDiscount ? 'discounts' : 'fees';
          const header = isPosition ? 'editPosition' : isDiscount ? 'editDiscount' : 'editFee';
          openEditModalCommand$.next({
            initialValue,
            formGroup: newForm,
            onFinish: (form) => {
              form.controls[path].controls.find((v) => {
                return v.getRawValue().id === initialValue.id
              }).patchValue(newForm.getRawValue());
            },
            remove: (form) => {
              form.controls[path].removeAt(form.controls[path].controls.findIndex((v) => {
                return v.getRawValue().id === initialValue.id
              }));
            },
            header,
          });
        } else {
          openEditModalCommand$.next({
            formGroup: formToEdit,
            onFinish: () => void 0,
            header: 'overall'
          });
        }
      } else if (formToEdit === 'addPosition') {
        const newPosition = defaultPosition();
        openEditModalCommand$.next({
          formGroup: newPosition,
          onFinish: () => form.controls.positions.insert(0, newPosition),
          header: 'addPosition'
        });
      } else {
        const newModifier = defaultModifier();
        const isFee = formToEdit === 'addFee';
        const header = isFee ? 'addFee' : 'addDiscount';
        openEditModalCommand$.next({
          formGroup: newModifier as any,
          onFinish: () => {
            const groupName = isFee ? 'fees' : 'discounts';
            form.controls[groupName].insert(0, newModifier);
          },
          header: header
        });
      }
    },
  }

  const nextStep$ = proceed$.pipe(switchMap(() => receiptFormState$(form.getRawValue(), receiptId)));

  return merge(
    concat(
      of(state),
      nextStep$,
    ),
    effect$,
  );
};
