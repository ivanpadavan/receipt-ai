import { FormArray } from "@/forms/form_array";
import { FormControl } from "@/forms/form_control";
import { FormGroup } from "@/forms/form_group";
import { InferForm } from "@/forms/type";
import { Observable, of, merge, finalize, startWith, EMPTY } from "rxjs";
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
export type ReceiptState = {
  scenario: FormScenario;
  onRowClick: (v: FormGroup) => void,
  proceed: () => void;
};

export const receiptFormState$ = (initialData: Receipt, openEditModal: (row: FormGroup) => void): Observable<ReceiptState> => {
  // Default position form group for adding new positions
  const defaultPosition = (): InferForm<Receipt['positions'][0]> => {
    return new FormGroup({
      name: new FormControl('', {
        validators: [nameNotEmpty]
      }),
      price: new FormControl(0, {
        validators: [priceNotZero]
      }),
      quantity: new FormControl(0, {
        validators: [quantityNotZero]
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
  const state: ReceiptState = {
    scenario: {
    type: validateReceipt(initialData).isValid ? 'editing' as const : 'validation' as const,
      form
    },
    proceed: () => void 0,
    onRowClick: openEditModal
  }


  // Create the main state observable
  const state$ = of(state);

  const setNewValueIfChanged = <T>(c: FormControl<T>, newValue: T): void => {
    if (newValue === c.value) {
      return;
    }
    c.setValue(newValue);
    c.updateValueAndValidity({ onlySelf: true });
  }

  let effect$: Observable<never> = EMPTY;

  if (state.scenario.type === 'editing') {
    effect$ = form.valueChanges.pipe(
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

    form.controls.total.controls.total.disable();
    form.controls.total.controls.positionsTotal.disable();
    form.controls.positions.controls.forEach(position => {
      position.controls.overall.disable();
    });
  }

  // Merge the state observable with side effects
  return merge(
    effect$,
    state$,
  );
};
