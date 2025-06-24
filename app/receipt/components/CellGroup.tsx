import { useReceiptState } from "@/app/receipt/components/ReceiptForm";
import { FormGroup } from "@/forms/form_group";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useState } from "react";

interface CellGroupProps {
  record: FormGroup;
  canEdit: boolean;
  children: (value: { onMouseEnter: () => void, onMouseLeave: () => void, onClick: () => void, className: string }) => React.ReactNode;
}

export const CellGroup = ({ record, canEdit, children }: CellGroupProps) => {
  useObservable(record.valueChanges, forceSync);
  const [hoverWithin, setHoverWithin] = useState(false);

  const { openEditModal } = useReceiptState();

  const props = {
    onMouseEnter: () => canEdit && setHoverWithin(true),
    onMouseLeave: () => canEdit && setHoverWithin(false),
    onClick: () => canEdit && openEditModal(record),
    className: (record.invalid ? 'bg-red-50 ' : '') + (canEdit && hoverWithin ? 'cursor-pointer bg-gray-100 ' : ''),
  };

  return children(props);
};
