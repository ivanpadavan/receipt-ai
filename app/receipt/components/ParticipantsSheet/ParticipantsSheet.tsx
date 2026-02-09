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
import { cn } from "@/utils/cn";
import {
  rowContentPaddingVariants,
  participantsAddButtonContainerVariants,
  participantsAddInputVariants,
  participantsAvatarPlaceholderVariants,
  participantsDangerMenuItemVariants,
  participantsDialogContentVariants,
  participantsDoneButtonVariants,
  participantsEmptyStateContainerVariants,
  participantsEmptyStateIconVariants,
  participantsFooterVariants,
  participantsListPaddingVariants,
  participantsRowMenuButtonVariants,
  participantsSheetBackgroundVariants,
  participantsSheetHeaderVariants,
  participantsDeleteActionVariants,
  avatarSizeVariants,
  iconLeadSpacingVariants,
  iconSizeVariants,
  iconButtonCompactVariants,
  textRoleVariants,
} from "@/app/receipt/components/ui-styles";

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
        className={cn(
          "h-[85vh] flex flex-col",
          participantsSheetBackgroundVariants(),
        )}
      >
        <DrawerHeader
          className={cn(
            "flex items-center justify-between",
            participantsSheetHeaderVariants(),
          )}
        >
          <DrawerTitle
            className={textRoleVariants({ role: "sheetTitle" })}
          >
            {t("participants")}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
            >
              <X className={iconSizeVariants({ size: "md" })} />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div
          className={cn(
            "flex-1 overflow-y-auto min-h-[200px]",
            participantsListPaddingVariants(),
          )}
        >
          {participants.length === 0 && !isAdding && (
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                participantsEmptyStateContainerVariants(),
              )}
            >
              <UserPlus
                className={cn(
                  "mb-3",
                  iconSizeVariants({ size: "xl" }),
                  participantsEmptyStateIconVariants(),
                )}
              />
              <p
                className={textRoleVariants({ role: "labelSmMutedCenter" })}
              >
                {t("participantsEmpty")}
              </p>
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
                <CardContent
                  className={cn(
                    "flex items-center gap-3",
                    rowContentPaddingVariants({ density: "regular" }),
                  )}
                >
                  <ParticipantAvatar
                    participant={participant}
                    className="shrink-0"
                  />
                  <span
                    className={cn(
                      "flex-1",
                      textRoleVariants({ role: "labelSm" }),
                    )}
                  >
                    {participant.displayName}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          iconButtonCompactVariants(),
                          participantsRowMenuButtonVariants(),
                        )}
                      >
                      <MoreVertical className={iconSizeVariants({ size: "sm" })} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(participant)}
                      className={participantsDangerMenuItemVariants()}
                    >
                      <Trash2
                        className={cn(
                          iconLeadSpacingVariants(),
                          iconSizeVariants({ size: "sm" }),
                        )}
                      />
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
              <CardContent
                className={cn(
                  "flex items-center gap-3",
                  rowContentPaddingVariants({ density: "regular" }),
                )}
              >
                <div
                  className={cn(
                    "shrink-0",
                    avatarSizeVariants({ size: "sm" }),
                    participantsAvatarPlaceholderVariants(),
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
                  className={cn("flex-1", participantsAddInputVariants())}
                />
                {hasNameConflict && (
                  <span
                    className={textRoleVariants({ role: "captionXsWarning" })}
                  >
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
          <div className={participantsAddButtonContainerVariants()}>
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <UserPlus
                className={cn(
                  iconLeadSpacingVariants(),
                  iconSizeVariants({ size: "sm" }),
                )}
              />
              {t("addParticipant")}
            </Button>
          </div>
        )}

        <div className={participantsFooterVariants()}>
          <Button
            onClick={onClose}
            className={cn("w-full", participantsDoneButtonVariants())}
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
        <AlertDialogContent className={participantsDialogContentVariants()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteParticipant")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteParticipantConfirm")}
              {deleteConfirm && (
                <span
                  className={cn(
                    "block mt-2",
                    textRoleVariants({ role: "amountSemibold" }),
                  )}
                >
                  {deleteConfirm.displayName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={participantsDeleteActionVariants()}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
