import {Subscribable} from 'rxjs';

/**
 * Determine if the argument is shaped like a Promise
 */
export function isPromise<T = any>(obj: any): obj is Promise<T> {
  // allow any Promise/A+ compliant thenable.
  // It's up to the caller to ensure that obj.then conforms to the spec
  return !!obj && typeof obj.then === 'function';
}

/**
 * Determine if the argument is a Subscribable
 */
export function isSubscribable<T>(obj: any|Subscribable<T>): obj is Subscribable<T> {
  return !!obj && typeof obj.subscribe === 'function';
}

export const enum RuntimeErrorCode {

  // Structure validation errors (10xx)
  NO_CONTROLS = 1000,
  MISSING_CONTROL = 1001,
  MISSING_CONTROL_VALUE = 1002,

  // Reactive Forms errors (1050-1099)
  FORM_CONTROL_NAME_MISSING_PARENT = 1050,
  FORM_CONTROL_NAME_INSIDE_MODEL_GROUP = 1051,
  FORM_GROUP_MISSING_INSTANCE = 1052,
  FORM_GROUP_NAME_MISSING_PARENT = 1053,
  FORM_ARRAY_NAME_MISSING_PARENT = 1054,

  // Validators errors (11xx)
  WRONG_VALIDATOR_RETURN_TYPE = -1101,

  // Value Accessor Errors (12xx)
  NG_VALUE_ACCESSOR_NOT_PROVIDED = 1200,
  COMPAREWITH_NOT_A_FN = 1201,
  NAME_AND_FORM_CONTROL_NAME_MUST_MATCH = 1202,
  NG_MISSING_VALUE_ACCESSOR = -1203,

  // Template-driven Forms errors (1350-1399)
  NGMODEL_IN_FORM_GROUP = 1350,
  NGMODEL_IN_FORM_GROUP_NAME = 1351,
  NGMODEL_WITHOUT_NAME = 1352,
  NGMODELGROUP_IN_FORM_GROUP = 1353,

}

export class RuntimeError<T extends number = RuntimeErrorCode> extends Error {
  constructor(public code: T, message: null|false|string) {
    super(formatRuntimeError<T>(code, message));
  }
}

function formatRuntimeError<T extends number = RuntimeErrorCode>(
  code: T, message: null|false|string): string {
  // Error code might be a negative number, which is a special marker that instructs the logic to
  // generate a link to the error details page on angular.io.
  // We also prepend `0` to non-compile-time errors.
  const fullCode = `NG0${Math.abs(code)}`;

  let errorMessage = `${fullCode}${message ? ': ' + message : ''}`;
  return errorMessage;
}

export function controlParentException(nameOrIndex: string | number | null): Error {
  return new RuntimeError(
    RuntimeErrorCode.FORM_CONTROL_NAME_MISSING_PARENT,
    `formControlName must be used with a parent formGroup directive. You'll want to add a formGroup
      directive and pass it an existing FormGroup instance (you can create one in your class).

      ${describeFormControl(nameOrIndex)}`,
  );
}

function describeFormControl(nameOrIndex: string | number | null): string {
  if (nameOrIndex == null || nameOrIndex === '') {
    return '';
  }

  const valueType = typeof nameOrIndex === 'string' ? 'name' : 'index';

  return `Affected Form Control ${valueType}: "${nameOrIndex}"`;
}

export function ngModelGroupException(): Error {
  return new RuntimeError(
    RuntimeErrorCode.FORM_CONTROL_NAME_INSIDE_MODEL_GROUP,
    `formControlName cannot be used with an ngModelGroup parent. It is only compatible with parents
      that also have a "form" prefix: formGroupName, formArrayName, or formGroup.`,
  );
}

export function missingFormException(): Error {
  return new RuntimeError(
    RuntimeErrorCode.FORM_GROUP_MISSING_INSTANCE,
    `formGroup expects a FormGroup instance. Please pass one in.`,
  );
}

export function groupParentException(): Error {
  return new RuntimeError(
    RuntimeErrorCode.FORM_GROUP_NAME_MISSING_PARENT,
    `formGroupName must be used with a parent formGroup directive.  You'll want to add a formGroup
    directive and pass it an existing FormGroup instance (you can create one in your class).`,
  );
}

export function arrayParentException(): Error {
  return new RuntimeError(
    RuntimeErrorCode.FORM_ARRAY_NAME_MISSING_PARENT,
    `formArrayName must be used with a parent formGroup directive.  You'll want to add a formGroup
      directive and pass it an existing FormGroup instance (you can create one in your class).`,
  );
}

export const disabledAttrWarning = `
  It looks like you're using the disabled attribute with a reactive form directive. If you set disabled to true
  when you set up this control in your component class, the disabled attribute will actually be set in the DOM for
  you. We recommend using this approach to avoid 'changed after checked' errors.

  Example:
  // Specify the \`disabled\` property at control creation time:
  form = new FormGroup({
    first: new FormControl({value: 'Nancy', disabled: true}, Validators.required),
    last: new FormControl('Drew', Validators.required)
  });

  // Controls can also be enabled/disabled after creation:
  form.get('first')?.enable();
  form.get('last')?.disable();
`;

export const asyncValidatorsDroppedWithOptsWarning = `
  It looks like you're constructing using a FormControl with both an options argument and an
  async validators argument. Mixing these arguments will cause your async validators to be dropped.
  You should either put all your validators in the options object, or in separate validators
  arguments. For example:

  // Using validators arguments
  fc = new FormControl(42, Validators.required, myAsyncValidator);

  // Using AbstractControlOptions
  fc = new FormControl(42, {validators: Validators.required, asyncValidators: myAV});

  // Do NOT mix them: async validators will be dropped!
  fc = new FormControl(42, {validators: Validators.required}, /* Oops! */ myAsyncValidator);
`;

export function ngModelWarning(directiveName: string): string {
  return `
  It looks like you're using ngModel on the same form field as ${directiveName}.
  Support for using the ngModel input property and ngModelChange event with
  reactive form directives has been deprecated in Angular v6 and will be removed
  in a future version of Angular.

  For more information on this, see our API docs here:
  https://angular.io/api/forms/${
    directiveName === 'formControl' ? 'FormControlDirective' : 'FormControlName'
  }#use-with-ngmodel
  `;
}

function describeKey(isFormGroup: boolean, key: string | number): string {
  return isFormGroup ? `with name: '${key}'` : `at index: ${key}`;
}

export function noControlsError(isFormGroup: boolean): string {
  return `
    There are no form controls registered with this ${
    isFormGroup ? 'group' : 'array'
  } yet. If you're using ngModel,
    you may want to check next tick (e.g. use setTimeout).
  `;
}

export function missingControlError(isFormGroup: boolean, key: string | number): string {
  return `Cannot find form control ${describeKey(isFormGroup, key)}`;
}

export function missingControlValueError(isFormGroup: boolean, key: string | number): string {
  return `Must supply a value for form control ${describeKey(isFormGroup, key)}`;
}

export function removeListItem<T>(list: T[], el: T): void {
  const index = list.indexOf(el);
  if (index > -1) list.splice(index, 1);
}

export type Writable<T> = {
  -readonly[K in keyof T]: T[K];
};
