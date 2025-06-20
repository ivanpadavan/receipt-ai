import { ReceiptFormContext } from "@/app/receipt/components/ReceiptForm";
import { FormGroup } from "@/forms/form_group";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useContext, useMemo, useState } from "react";


interface CellGroupProps {
  record: FormGroup;
  children: (value: { onMouseEnter: () => void, onMouseLeave: () => void, onClick: () => void, className: string }) => React.ReactNode;
}

export const CellGroup = ({ record, children }: CellGroupProps) => {
  useObservable(record.valueChanges, forceSync);
  const [hoverWithin, setHoverWithin] = useState(false);

  const ctx = useContext(ReceiptFormContext);
  const onClick = useMemo(() => () => ctx?.openEditModal(record), [record, ctx]);

  const props = {
    onMouseEnter: () => setHoverWithin(true),
    onMouseLeave: () => setHoverWithin(false),
    onClick,
    className: (record.invalid ? 'bg-red-50 ' : '') + (hoverWithin ? 'cursor-pointer bg-gray-100 ' : ''),
  };

  return children(props);
};
