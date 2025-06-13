import React from "react";
import { AddButton } from "./AddButton";

interface FormTitleProps {
  title: string;
  onAddClick?: () => void;
  className?: string;
  showColon?: boolean;
}

export const FormArrayTitle: React.FC<FormTitleProps> = ({
  title,
  onAddClick,
  className = "",
  showColon = false
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <AddButton onClick={onAddClick} className="mr-2" />
      <span className="flex-grow">
        {title}{showColon ? ":" : ""}
      </span>
    </div>
  );
};
