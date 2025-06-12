import { FormGroup } from "@/forms/form_group";
import { useObservableFactory } from "@/hooks/useObservableFactory";
import { useMemo, useState } from "react";


interface CellGroupProps {
  record: FormGroup;
  children: (value: { onMouseEnter: () => void, onMouseLeave: () => void, className: string }) => React.ReactNode;
}

export const CellGroup = ({ record, children }: CellGroupProps) => {
  useObservableFactory(() => record.value$);
  const [hoverWithin, setHoverWithin] = useState(false);

  const props = {
    onMouseEnter: () => setHoverWithin(true),
    onMouseLeave: () => setHoverWithin(false),
    className: (record.invalid ? 'bg-red-50 ' : '') + (hoverWithin ? 'cursor-pointer bg-gray-100 ' : ''),
  };

  return children(props);
};
