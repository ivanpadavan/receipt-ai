import { useReceiptState } from "@/app/receipt/components/ReceiptForm";
import { FormGroup } from "@/forms/form_group";
import { forceSync, useObservable } from "@/hooks/rx/useObservable";
import { useState } from "react";


interface CellGroupProps {
  record: FormGroup;
  children: (value: { onMouseEnter: () => void, onMouseLeave: () => void, onClick: () => void, className: string }) => React.ReactNode;
}

export const CellGroup = ({ record, children }: CellGroupProps) => {
  useObservable(record.valueChanges, forceSync);
  const [hoverWithin, setHoverWithin] = useState(false);

  const { openEditModal, scenario } = useReceiptState();

  // Determine if this record can be edited based on its type
  const isPositionForm = 'overall' in record.controls;
  const isModifierForm = 'value' in record.controls;
  const isTotalsForm = 'positionsTotal' in record.controls;

  const canEdit = (isPositionForm && scenario.canEdit.positionForm) ||
                 (isModifierForm && scenario.canEdit.modifierForm) ||
                 (isTotalsForm && scenario.canEdit.totalsForm);

  const props = {
    onMouseEnter: () => canEdit && setHoverWithin(true),
    onMouseLeave: () => canEdit && setHoverWithin(false),
    onClick: () => canEdit && openEditModal(record),
    className: (record.invalid ? 'bg-red-50 ' : '') + (canEdit && hoverWithin ? 'cursor-pointer bg-gray-100 ' : ''),
  };

  return children(props);
};
