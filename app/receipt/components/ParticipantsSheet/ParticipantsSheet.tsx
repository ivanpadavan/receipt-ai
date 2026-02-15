"use client";

import React, { useMemo, useState } from "react";
import { ParticipantDTO } from "@/model/receipt/model";
import { ParticipantAvatar } from "@/app/receipt/components/ui/participant-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import { ConfirmCancelGroup } from "@/app/receipt/components/ui/ConfirmCancelGroup";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { ActionMenu } from "@/app/receipt/components/ui/ActionMenu";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
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
import { t } from "@/app/i18n/translations";
import { UserPlus, Trash2, MoreVertical } from "lucide-react";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import {
  rowContentPaddingVariants,
  avatarSizeVariants,
  iconLeadSpacingVariants,
  iconSizeVariants,
  inlineGapVariants,
  rowVariants,
  dialogContent,
  dialogHeader,
  dialogFooter,
  dialogHeaderTitle,
  sheetBodyPadding,
  sheetShell,
  textVariants,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";

// ── Participants-scoped styles ──────────────────
const emptyStateContainer = "h-40 gap-1";
const emptyStateIcon = "text-muted-foreground/40";
const avatarPlaceholder = `${radiusTokens.full} bg-muted/50 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground font-semibold`;
const addInput = "border-amber-400 focus-visible:ring-amber-400 h-8";
const addButtonContainer = "px-4 py-3";
const footer = "px-4 pb-4";
const deleteAction = "bg-destructive text-destructive-foreground hover:bg-destructive/90";

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
      <DrawerContent className={sheetShell}>
        <DrawerHeader>
          <DrawerTitle>
            {t("participants")}
          </DrawerTitle>
        </DrawerHeader>

        <div
          className={cn(
            "flex-1 overflow-y-auto min-h-[200px]",
            sheetBodyPadding,
          )}
        >
          {participants.length === 0 && !isAdding && (
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                emptyStateContainer,
              )}
            >
              <UserPlus
                className={cn(
                  "mb-3",
                  iconSizeVariants({ size: "xl" }),
                  emptyStateIcon,
                )}
              />
              <p
                className={cn(textVariants({ size: "sm", tone: "muted" }), "text-center")}
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
                    rowVariants({ align: "center", width: "full" }),
                    inlineGapVariants({ size: "md" }),
                    rowContentPaddingVariants({ density: "regular" }),
                  )}
                >
                  <ParticipantAvatar
                    participant={participant}
                    className="shrink-0"
                  />
                  <div className="flex-1">
                    <span
                      className={textVariants({ size: "sm", weight: "medium" })}
                    >
                      {participant.displayName}
                    </span>
                    {participant.kind === "REAL" && (
                      <div
                        className={cn(
                          "mt-0.5 inline-flex items-center gap-1",
                          textVariants({ size: "xs", tone: "muted" }),
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            participant.isOnline
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/40",
                          )}
                        />
                        {participant.isOnline ? t("online") : t("offline")}
                      </div>
                    )}
                  </div>
                  <ActionMenu
                    triggerLabel={t("edit")}
                    triggerIcon={<MoreVertical className={iconSizeVariants({ size: "sm" })} />}
                    items={[
                      {
                        id: "delete",
                        label: t("delete"),
                        tone: "danger",
                        onSelect: () => handleDeleteClick(participant),
                        icon: (
                          <Trash2
                            className={cn(
                              iconLeadSpacingVariants(),
                              iconSizeVariants({ size: "sm" }),
                            )}
                          />
                        ),
                      },
                    ]}
                  />
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
                  rowVariants({ align: "center", width: "full" }),
                  inlineGapVariants({ size: "md" }),
                  rowContentPaddingVariants({ density: "regular" }),
                )}
              >
                <div
                  className={cn(
                    "shrink-0",
                    avatarSizeVariants({ size: "sm" }),
                    avatarPlaceholder,
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
                  className={cn("flex-1", addInput)}
                />
                {hasNameConflict && (
                  <span
                    className={textVariants({ size: "xs", tone: "warning" })}
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
          <div className={addButtonContainer}>
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

        <div className={footer}>
          <Button
            onClick={onClose}
            className="w-full"
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
        <AlertDialogContent className={dialogContent}>
          <AlertDialogHeader className={dialogHeader}>
            <AlertDialogTitle className={dialogHeaderTitle}>
              {t("deleteParticipant")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteParticipantConfirm")}
              {deleteConfirm && (
                <span
                  className={cn(
                    "block mt-2",
                    textVariants({ weight: "semibold" }),
                  )}
                >
                  {deleteConfirm.displayName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className={cn(dialogFooter, inlineGapVariants({ size: "sm" }))}
          >
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className={deleteAction}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
