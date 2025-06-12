import { FormArray } from "@/forms/form_array";
import { FormControl } from "@/forms/form_control";
import { FormGroup } from "@/forms/form_group";
import { InferForm } from "@/forms/type";
import { Observable, of, merge, finalize, startWith } from "rxjs";
import { tap, ignoreElements } from "rxjs/operators";
import {
  Receipt, validateReceipt, calculatePositionsTotal, calculateTotal
} from "@/model/receipt/model";
import {
  nameNotEmpty,
  quantityNotZero,
  priceNotZero,
  valueNotZero,
  overallMatchesQuantityPrice,
  positionsTotalMatchesSum,
  totalMatchesCalculation
} from "./validators";

type FormType = 'validation' | 'editing' | 'quantities';

export type ReceiptForm = InferForm<Receipt>;

export type ModifierForm = ReceiptForm['controls']['total']['controls']['additions'] | ReceiptForm['controls']['total']['controls']['discounts'];

export type FormScenario = { type: FormType; form: ReceiptForm };

// Receipt state types
export type ReceiptFormState = {
  scenario: FormScenario;
  proceed: () => void;
};

export const receiptFormState$ = (initialData: Receipt): Observable<ReceiptFormState> => {
  // Default position form group for adding new positions
  const defaultPosition = (): InferForm<Receipt['positions'][0]> => {
    return new FormGroup({
      name: new FormControl('', {
        validators: [nameNotEmpty]
      }),
      quantity: new FormControl(0, {
        validators: [quantityNotZero]
      }),
      price: new FormControl(0, {
        validators: [priceNotZero]
      }),
      overall: new FormControl(0, {
        validators: [overallMatchesQuantityPrice]
      })
    });
  };

  // Default modifier form group for adding new modifiers
  const defaultModifier = (): ModifierForm['controls'][number] => {
    return new FormGroup({
      name: new FormControl('', {
        validators: [nameNotEmpty]
      }),
      value: new FormControl(0, {
        validators: [valueNotZero]
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

  // Initialize the form with the initial data
  form.patchValue(initialData, {emitEvent: false});
  form.patchValue(initialData, {emitEvent: false});

  // Determine the initial state based on validation
  const initialState = validateReceipt(initialData).isValid
    ? { scenario: { type: 'editing' as const, form }, proceed: () => void 0 }
    : { scenario: { type: 'validation' as const, form }, proceed: () => void 0 };


  // Create the main state observable
  const state$ = of(initialState);

  const setNewValueIfChanged = <T>(c: FormControl<T>, newValue: T): void => {
    if (newValue === c.value) {
      return;
    }
    c.setValue(newValue);
    c.updateValueAndValidity({ onlySelf: true });
  }

  const effect$ = form.valueChanges.pipe(
    tap(() => {
      form.controls.positions.controls.forEach(position => {
        const { quantity, price } = position.getRawValue();
        setNewValueIfChanged(position.controls.overall, quantity * price);
      });
      const { positionsTotal, total } = form.controls.total.controls;
      setNewValueIfChanged(positionsTotal, calculatePositionsTotal(form.getRawValue().positions));
      setNewValueIfChanged(total, calculateTotal(form.getRawValue()));
    }),
    ignoreElements(),
  );

  // Merge the state observable with side effects
  return merge(
    effect$,
    state$,
  );
};
