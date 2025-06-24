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
  const isClickable = !!onAddClick;

  return (
    <div
      className={`flex items-center ${isClickable ? 'cursor-pointer hover:bg-gray-100' : ''} ${className}`}
      onClick={onAddClick}
    >
      <AddButton className={`mr-2 ${!isClickable ? 'opacity-50' : ''}`} />
      <span className="flex-grow">
        {title}
      </span>
    </div>
  );
};
