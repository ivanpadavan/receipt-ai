"use client";

import React, { useMemo, useState } from "react";
import { ParticipantDTO } from "@/model/receipt/model";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
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
import { UserPlus, X, Check, Trash2, MoreVertical } from "lucide-react";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import {
  iconButtonVariants,
  iconGroupVariants,
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
      <DrawerContent className="h-[85vh] flex flex-col bg-gradient-to-b from-white to-gray-50">
        <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <DrawerTitle className="text-xl font-semibold text-gray-900">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">{t("participantsEmpty")}</p>
            </div>
          )}

          {participants.map((participant) => {
            return (
              <Card
                key={participant.id}
                variant="interactive"
                shadow="md"
                className="mb-2 rounded-xl"
              >
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <ParticipantAvatar
                    participant={participant}
                    className="shrink-0"
                  />
                  <span className="flex-1 font-medium text-gray-800">
                    {participant.displayName}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(participant)}
                        className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}

          {isAdding && (
            <Card
              variant="warning"
              shadow="md"
              className="mb-2 rounded-xl border-2 border-amber-500"
            >
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold shrink-0 text-lg">
                  ?
                </div>
                <Input
                  autoFocus
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("newParticipantNamePlaceholder")}
                  className="flex-1 border-none bg-transparent p-0 text-base focus:ring-0 focus-visible:ring-0"
                />
                {hasNameConflict && (
                  <span className="text-xs text-amber-600">
                    {t("nameConflict")}
                  </span>
                )}
                <ButtonGroup
                  className={iconGroupVariants({ density: "roomy" })}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setNewParticipantName("");
                      setIsAdding(false);
                    }}
                    className={iconButtonVariants({
                      size: "liquid",
                      tone: "neutral",
                    })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <ButtonGroupSeparator className="mx-0 h-5 opacity-30" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddParticipant}
                    disabled={!newParticipantName.trim()}
                    className={iconButtonVariants({
                      size: "liquid",
                      tone: "successSoft",
                    })}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </ButtonGroup>
              </CardContent>
            </Card>
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

        <div className="p-4 border-t border-gray-100 bg-white">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-transform"
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
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteParticipant")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteParticipantConfirm")}
              {deleteConfirm && (
                <span className="block mt-2 font-semibold text-gray-900">
                  {deleteConfirm.displayName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
