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
  dialogContentVariants,
  dialogFooterVariants,
  dialogHeaderTitleVariants,
  dialogHeaderVariants,
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
      <AlertDialogContent className={dialogContentVariants()}>
        <AlertDialogHeader className={dialogHeaderVariants()}>
          <AlertDialogTitle className={dialogHeaderTitleVariants()}>
            {t("removedTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("removedBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={cn(dialogFooterVariants(), inlineGapVariants({ size: "sm" }))}
        >
          <AlertDialogAction onClick={onGoHome}>{t("goHome")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
