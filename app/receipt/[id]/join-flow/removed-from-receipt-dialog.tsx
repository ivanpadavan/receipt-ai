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

interface RemovedFromReceiptDialogProps {
  onGoHome: () => void;
}

export function RemovedFromReceiptDialog({
  onGoHome,
}: RemovedFromReceiptDialogProps) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("removedTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("removedBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onGoHome}>{t("goHome")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
