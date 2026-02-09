"use client";

import React, { useMemo, useState } from "react";
import { ParticipantDTO } from "@/model/receipt/model";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { ConfirmCancelGroup } from "@/app/receipt/components/ui/ConfirmCancelGroup";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/app/i18n/translations";
import { UserPlus, X, Trash2, MoreVertical } from "lucide-react";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cva } from "class-variance-authority";
import { cn } from "@/utils/cn";

const sheetBackgroundVariants = cva("bg-gradient-to-b from-white to-gray-50");

const headerVariants = cva("border-b border-gray-100");

const headerTitleVariants = cva("text-xl font-semibold text-gray-900");

const emptyStateIconVariants = cva("text-gray-300");

const emptyStateTextVariants = cva("text-gray-500 text-sm");
const emptyStateContainerVariants = cva("text-center");

const rowNameVariants = cva("font-medium text-gray-800");

const rowMenuButtonVariants = cva("text-gray-500");

const dangerMenuItemVariants = cva(
  "text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50",
);

const avatarPlaceholderVariants = cva(
  "rounded-full flex items-center justify-center font-semibold text-lg",
);

const addInputVariants = cva(
  "border-none bg-transparent p-0 text-base focus:ring-0 focus-visible:ring-0",
);

const doneButtonVariants = cva(
  "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform",
);

const footerVariants = cva("border-t border-gray-100 bg-white");

const conflictTextVariants = cva("text-xs text-amber-600");
const dialogContentVariants = cva("rounded-xl");
const deleteNameVariants = cva("font-semibold text-gray-900");
const deleteActionVariants = cva("bg-red-500 hover:bg-red-600 text-white");

interface ParticipantsSheetProps {
  onClose?: () => void;
  receiptId: string;
}

export const ParticipantsSheet: React.FC<ParticipantsSheetProps> = ({
  onClose,
  receiptId,
}) => {
  const participants = useParticipantsStore((s) => s.participants);
  const setParticipants = useParticipantsStore((s) => s.setParticipants);

  const [newParticipantName, setNewParticipantName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    displayName: string;
    kind: "REAL" | "MOCK";
  } | null>(null);
  const trimmedNewName = newParticipantName.trim();
  const hasNameConflict = useMemo(() => {
    if (!trimmedNewName) return false;
    return participants.some(
      (p) =>
        p.displayName.trim().toLowerCase() === trimmedNewName.toLowerCase(),
    );
  }, [participants, trimmedNewName]);

  const handleAddParticipant = async () => {
    if (!trimmedNewName) return;
    const res = await fetch(`/api/receipt/${receiptId}/participants/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: trimmedNewName }),
    });
    if (!res.ok) return;
    const json = await res.json();
    const participant = json.participant as ParticipantDTO | undefined;
    if (participant) {
      setParticipants([...participants, participant]);
    }
    setNewParticipantName("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddParticipant();
    } else if (e.key === "Escape") {
      setNewParticipantName("");
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (participant: ParticipantDTO) => {
    setDeleteConfirm({
      id: participant.id,
      displayName: participant.displayName,
      kind: participant.kind,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm !== null) {
      const base = `/api/receipt/${receiptId}/participants`;
      const path =
        deleteConfirm.kind === "REAL"
          ? `${base}/real/${deleteConfirm.id}`
          : `${base}/mock/${deleteConfirm.id}`;
      setParticipants(participants.filter((p) => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      await fetch(path, { method: "DELETE" });
    }
  };

  return (
    <>
      <DrawerContent
        className={cn("h-[85vh] flex flex-col", sheetBackgroundVariants())}
      >
        <DrawerHeader
          className={cn("flex items-center justify-between px-5 py-4", headerVariants())}
        >
          <DrawerTitle className={headerTitleVariants()}>
            {t("participants")}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
          {participants.length === 0 && !isAdding && (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-12",
                emptyStateContainerVariants(),
              )}
            >
              <UserPlus className={cn("h-12 w-12 mb-3", emptyStateIconVariants())} />
              <p className={emptyStateTextVariants()}>{t("participantsEmpty")}</p>
            </div>
          )}

          {participants.map((participant) => {
            return (
              <ReceiptCard
                key={participant.id}
                interactive
                shadow="md"
                radius="xl"
                className="mb-2"
              >
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <ParticipantAvatar
                    participant={participant}
                    className="shrink-0"
                  />
                  <span className={cn("flex-1", rowNameVariants())}>
                    {participant.displayName}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", rowMenuButtonVariants())}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(participant)}
                        className={dangerMenuItemVariants()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </ReceiptCard>
            );
          })}

          {isAdding && (
            <ReceiptCard
              tone="warmStrong"
              shadow="md"
              radius="xl"
              className="mb-2"
            >
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div
                  className={cn(
                    "w-8 h-8 shrink-0",
                    avatarPlaceholderVariants(),
                  )}
                >
                  ?
                </div>
                <Input
                  autoFocus
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("newParticipantNamePlaceholder")}
                  className={cn("flex-1", addInputVariants())}
                />
                {hasNameConflict && (
                  <span className={conflictTextVariants()}>
                    {t("nameConflict")}
                  </span>
                )}
                <ConfirmCancelGroup
                  onCancel={() => {
                    setNewParticipantName("");
                    setIsAdding(false);
                  }}
                  onConfirm={handleAddParticipant}
                  confirmDisabled={!newParticipantName.trim()}
                />
              </CardContent>
            </ReceiptCard>
          )}
        </div>

        {!isAdding && (
          <div className="px-4 pb-4 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("addParticipant")}
            </Button>
          </div>
        )}

        <div className={cn("p-4", footerVariants())}>
          <Button
            onClick={onClose}
            className={cn("w-full py-3", doneButtonVariants())}
          >
            {t("done")}
          </Button>
        </div>
      </DrawerContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent className={dialogContentVariants()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteParticipant")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteParticipantConfirm")}
              {deleteConfirm && (
                <span className={cn("block mt-2", deleteNameVariants())}>
                  {deleteConfirm.displayName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={deleteActionVariants()}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
