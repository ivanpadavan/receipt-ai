import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/app/i18n/translations";
import {
  dialogContent,
  dialogFooter,
  dialogHeaderTitle,
  dialogHeader,
  inlineGapVariants,
} from "@/app/receipt/components/ui-styles";
import { cn } from "@/utils/cn";

interface RemovedFromReceiptDialogProps {
  onGoHome: () => void;
}

export function RemovedFromReceiptDialog({
  onGoHome,
}: RemovedFromReceiptDialogProps) {
  return (
    <AlertDialog open>
      <AlertDialogContent className={dialogContent}>
        <AlertDialogHeader className={dialogHeader}>
          <AlertDialogTitle className={dialogHeaderTitle}>
            {t("removedTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("removedBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={cn(dialogFooter, inlineGapVariants({ size: "sm" }))}
        >
          <AlertDialogAction onClick={onGoHome}>{t("goHome")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
