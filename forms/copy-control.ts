import { AbstractControl } from "@/forms/abstract_model";
import { FormArray } from "@/forms/form_array";
import { FormControl } from "@/forms/form_control";
import { FormGroup } from "@/forms/form_group";

export function copyControl<T extends AbstractControl>(value: T): T {
  if (value instanceof FormGroup) {
    const result = new FormGroup({} as Record<string, AbstractControl>, { validators: value.validator, asyncValidators: value.asyncValidator, updateOn: value._updateOn });
    Object.entries(result.controls).forEach(([name, control]) => {
      result.addControl(name, copyControl(control));
    })
    return result as unknown as T;
  } else if (value instanceof FormArray) {
    const result = new FormArray([] as AbstractControl[], { validators: value.validator, asyncValidators: value.asyncValidator, updateOn: value._updateOn });
    value.controls.forEach(control => {
      result.push(copyControl(control));
    })
    return result as unknown as T;
  }

  if (!(value instanceof FormControl)) {
    throw new Error('Unknown control type');
  }

  return new FormControl(value.value, { validators: value.validator, asyncValidators: value.asyncValidator, updateOn: value._updateOn }) as unknown as T;
}
