import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  addButtonVariants,
  iconSizeVariants,
} from "@/app/receipt/components/ui-styles";

interface AddButtonProps {
  onClick?: () => void;
  className?: string;
}

export const AddButton: React.FC<AddButtonProps> = ({
  onClick,
  className = "",
}) => {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      className={cn(addButtonVariants(), className)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconSizeVariants({ size: "sm" })}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
          clipRule="evenodd"
        />
      </svg>
    </Button>
  );
};
