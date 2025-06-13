import { ModifierForm } from "@/app/receipt/[id]/state";
import { CellGroup } from "@/app/receipt/components/CellGroup";
import React from "react";
import { Cell } from "./Cell";
import { FormArrayTitle } from "./FormArrayTitle";

interface ItemsSectionProps {
  title: string;
  items: ModifierForm | 'placeholder';
}

export const Modifiers: React.FC<ItemsSectionProps> = ({ title, items }) => {
  if (items === 'placeholder') {
    return (
      <>
        <tr>
          <td>
            <FormArrayTitle title={title} showColon={true} />
          </td>
          <td colSpan={3}>-</td>
        </tr>
      </>
    );
  }

  return (
    <>
      {items.controls.map((item, index) => (
        <CellGroup record={item} key={`${title}-${index}`} >{(props) => (<>
          <tr>
            {index === 0 && (
              <td rowSpan={items.length * 2}>
                <FormArrayTitle title={title} showColon={true} />
              </td>
            )}
            <td {...props}>Название</td>
            <Cell {...props} formControl={item.controls.name} colSpan={2} />
          </tr>
          <tr>
            <td {...props}>Сумма</td>
            <Cell {...props} formControl={item.controls.value} colSpan={2} />
          </tr>
        </>)}
        </CellGroup>
      ))}
    </>
  );
};
