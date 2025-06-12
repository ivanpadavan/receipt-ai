import { FormControl } from "@/forms/form_control";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import React from "react";
import { startWith } from "rxjs";

interface FormControlCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  formControl: FormControl;
}

export const Cell: React.FC<FormControlCellProps> = ({ formControl, className = '', ...props }) => {
  const [value] = useObservableFactory(() => formControl.value$)
  const isInvalid = formControl.invalid && formControl.errors?.length > 0;
  const isEditable = !formControl.disabled;

  const handleClick = () => {
    if (!isEditable) {
      return;
    }

    // Then use prompt to get the new value
    const newValue = window.prompt(`Enter new value: Current value: ${value}`, String(value));

    if (newValue === null) {
      return;
    }
    // Convert to number if the original value was a number
    const convertedValue = typeof value === 'number' ? Number(newValue) : newValue;
    if (typeof convertedValue === 'number' && isNaN(convertedValue)) {
      return;
    }
    formControl.patchValue(convertedValue);
  }

  return (
    <td
      onClick={handleClick}
      className={`${className} ${isInvalid ? 'text-red-500' : ''}`}
      title={isInvalid ? formControl.errors?.join(', ') : undefined}
      {...props}
    >
      {formControl.value}
    </td>
  );
};
