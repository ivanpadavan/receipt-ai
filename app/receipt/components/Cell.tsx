import { FormControl } from "@/forms/form_control";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import React from "react";

interface FormControlCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  formControl: FormControl;
}

export const Cell: React.FC<FormControlCellProps> = ({ formControl, className = '', ...props }) => {
  const [value] = useObservableFactory(() => formControl.value$)
  const isInvalid = formControl.invalid;

  return (
    <td
      className={`${className} ${isInvalid ? 'text-red-500' : ''}`}
      {...props}
    >
      {value}
    </td>
  );
};
