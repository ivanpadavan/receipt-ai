import React from "react";
import { AddButton } from "./AddButton";

interface FormTitleProps {
  title: string;
  onAddClick?: () => void;
  className?: string;
}

export const FormArrayTitle: React.FC<FormTitleProps> = ({
  title,
  onAddClick,
  className = "",
}) => {
  return (
    <div className={`flex items-center ${className}`} onClick={onAddClick} >
      <AddButton className="mr-2" />
      <span className="flex-grow">
        {title}
      </span>
    </div>
  );
};
