import { EditModalProps, PositionForm } from "@/app/receipt/[id]/receipt-state";
import { useObservable } from "@/hooks/rx/useObservable";
import React from "react";
import { t } from "@/app/i18n/translations";
import {
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";


export const SplittingSheet: React.FC<EditModalProps> = ({ formGroup }) => {
  const positionFormGroup = formGroup as PositionForm;
  const position = positionFormGroup.value;
  useObservable(formGroup.valueChanges);
    return (
      <DrawerContent>
        <DrawerTitle className={'p-4 pt-4 text-center'}>{position.name}</DrawerTitle>
        <p className="text-gray-700 mb-4">Happy to be here</p>
        <DrawerClose asChild>
          <Button
            variant="secondary"
          >
            {t("close")}
          </Button>
        </DrawerClose>
      </DrawerContent>
    );
};
