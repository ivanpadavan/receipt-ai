"use client";

import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Receipt, ReceiptParticipant } from "@/model/receipt/model";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
} from "@/components/ui/drawer";
import { t } from "@/app/i18n/translations";
import { UserPlus, X, Check, Trash2 } from "lucide-react";
import { createDefaultParticipant } from "@/app/receipt/[id]/useReceiptFormState";

// Predefined colors for participants
const PARTICIPANT_COLORS = [
    "#F59E0B", // amber
    "#10B981", // emerald
    "#3B82F6", // blue
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#EF4444", // red
    "#06B6D4", // cyan
    "#84CC16", // lime
];

const getNextColor = (participants: ReceiptParticipant[]): string => {
    const usedColors = new Set(participants.map((p) => p.color));
    const available = PARTICIPANT_COLORS.find((c) => !usedColors.has(c));
    return available || PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
};

interface ParticipantsSheetProps {
    onClose?: () => void;
}

export const ParticipantsSheet: React.FC<ParticipantsSheetProps> = ({ onClose }) => {
    const form = useFormContext<Receipt>();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "participants",
    });

    const [newParticipantName, setNewParticipantName] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAddParticipant = () => {
        if (newParticipantName.trim()) {
            const newParticipant: ReceiptParticipant = {
                ...createDefaultParticipant(),
                name: newParticipantName.trim(),
                color: getNextColor(fields as ReceiptParticipant[]),
            };
            append(newParticipant);
            setNewParticipantName("");
            setIsAdding(false);
        }
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

    return (
        <DrawerContent className="max-h-[85vh] flex flex-col bg-gradient-to-b from-white to-gray-50">
            <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <DrawerTitle className="text-xl font-semibold text-gray-900">
                    {t("participants")}
                </DrawerTitle>
                <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="absolute right-3 top-3">
                        <X className="h-5 w-5" />
                    </Button>
                </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
                {fields.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <UserPlus className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">Добавьте участников чека</p>
                    </div>
                )}

                {fields.map((field, index) => {
                    const participant = field as unknown as ReceiptParticipant;
                    return (
                        <div
                            key={field.id}
                            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl mb-2 shadow-sm transition-all duration-200 hover:shadow-md group"
                        >
                            <ParticipantAvatar participant={participant} className="shrink-0" />
                            <span className="flex-1 font-medium text-gray-800">{participant.name}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            </Button>
                        </div>
                    );
                })}

                {isAdding && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2 border-dashed border-amber-500 mb-2">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold shrink-0"
                            style={{
                                backgroundColor: getNextColor(fields as ReceiptParticipant[]) + "20",
                                color: getNextColor(fields as ReceiptParticipant[]),
                            }}
                        >
                            ?
                        </div>
                        <Input
                            autoFocus
                            value={newParticipantName}
                            onChange={(e) => setNewParticipantName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Имя нового участника"
                            className="flex-1 border-none bg-transparent p-0 text-base focus:ring-0 focus-visible:ring-0"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleAddParticipant}
                            disabled={!newParticipantName.trim()}
                            className="text-green-500 hover:bg-green-500/10"
                        >
                            <Check className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setNewParticipantName("");
                                setIsAdding(false);
                            }}
                            className="text-gray-400"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {!isAdding && (
                <div className="px-4 pb-4 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsAdding(true)}
                        className="w-full border-dashed border-amber-500 text-amber-500 font-medium hover:bg-amber-500/5 hover:border-amber-600 hover:text-amber-600"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t("addParticipant")}
                    </Button>
                </div>
            )}

            <div className="p-4 border-t border-gray-100 bg-white">
                <Button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30"
                >
                    {t("done")}
                </Button>
            </div>
        </DrawerContent>
    );
};
