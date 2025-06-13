import React from "react";

interface AddButtonProps {
  onClick?: () => void;
  className?: string;
}

export const AddButton: React.FC<AddButtonProps> = ({ onClick, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    </button>
  );
};
