import { FormControl } from "@/forms/form_control";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import React from "react";

interface FormControlCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  formControl: FormControl;
}

export const Cell: React.FC<FormControlCellProps> = ({ formControl, className = '', ...props }) => {
  const value = useObservable(formControl.value$, forceSync);
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
