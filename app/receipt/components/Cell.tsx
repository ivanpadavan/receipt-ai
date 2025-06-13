import { FormControl } from "@/forms/form_control";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import React from "react";

interface FormControlCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  formControl: FormControl;
}

export const Cell: React.FC<FormControlCellProps> = ({ formControl, className = '', ...props }) => {
  const [value] = useObservableFactory(() => formControl.value$)
  const isInvalid = formControl.invalid && formControl.errors?.length > 0;

  return (
    <td
      className={`${className} ${isInvalid ? 'text-red-500' : ''}`}
      title={isInvalid ? formControl.errors?.join(', ') : undefined}
      {...props}
    >
      {value}
    </td>
  );
};
