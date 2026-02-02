"use client";

import React, { useMemo } from "react";
import { Receipt } from "@/model/receipt/model";
import { calculateBalances } from "@/app/receipt/utils/calculator";
import { t } from "@/app/i18n/translations";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface SummaryScreenProps {
    receipt: Receipt;
    onBack: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
    receipt,
    onBack,
}) => {
    const balances = useMemo(() => calculateBalances(receipt), [receipt]);
    const grandTotal = useMemo(
        () => balances.reduce((acc, b) => acc + b.finalAmount, 0),
        [balances]
    );

    const handleShare = () => {
        const lines = [
            `${t("receipt")}: ${grandTotal.toFixed(0)} ₽`,
            ...balances.map((b) => {
                const p = receipt.participants.find((p) => p.id === b.participantId);
                return `${p?.name || "Unknown"}: ${b.finalAmount.toFixed(0)} ₽`;
            }),
        ];
        navigator.clipboard.writeText(lines.join("\n"));
        toast.success(t("copiedToClipboard") || "Copied to clipboard");
    };

    return (
        <div className="flex flex-col h-full bg-background max-w-md mx-auto w-full shadow-sm rounded-lg overflow-hidden border">
            {/* Header / Hero */}
            <div className="p-6 text-center border-b bg-card relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-2 text-muted-foreground"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-medium text-muted-foreground mb-1">
                    {t("total")}
                </h2>
                <div className="text-4xl font-bold text-foreground">
                    {grandTotal.toFixed(0)}{" "}
                    <span className="text-2xl text-muted-foreground">₽</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <Accordion type="single" collapsible className="space-y-3">
                    {balances.map((balance) => {
                        const participant = receipt.participants.find(
                            (p) => p.id === balance.participantId
                        );
                        if (!participant) return null;

                        return (
                            <AccordionItem
                                key={balance.participantId}
                                value={balance.participantId}
                                className="border rounded-lg bg-card px-0 overflow-hidden"
                            >
                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3 w-full">
                                        <ParticipantAvatar participant={participant} />
                                        <span className="font-medium text-lg flex-1 text-left">
                                            {participant.name}
                                        </span>
                                        <span className="font-bold text-xl mr-2">
                                            {balance.finalAmount.toFixed(0)} ₽
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-0 pb-0 bg-muted/20 border-t">
                                    <ul className="divide-y divide-border/50">
                                        {balance.items.map((item, idx) => (
                                            <li
                                                key={idx}
                                                className="flex justify-between py-2 px-4 text-sm"
                                            >
                                                <span className="text-muted-foreground truncate max-w-[70%]">
                                                    {item.positionName}
                                                    <span className="block text-xs opacity-70">
                                                        {item.description}
                                                    </span>
                                                </span>
                                                <span className="font-medium">
                                                    {item.rawAmount.toFixed(0)} ₽
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                                        <div className="p-2 text-xs text-center text-muted-foreground italic border-t border-border/50">
                                            {balance.finalAmount > balance.baseAmount
                                                ? `+ ${(
                                                    balance.finalAmount - balance.baseAmount
                                                ).toFixed(0)} ₽ (fees/tips)`
                                                : `- ${(
                                                    balance.baseAmount - balance.finalAmount
                                                ).toFixed(0)} ₽ (discounts)`}
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-background">
                <Button className="w-full gap-2" size="lg" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    {t("share")}
                </Button>
            </div>
        </div>
    );
};
