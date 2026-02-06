"use client";

import React, { useMemo } from "react";
import { ReceiptData } from "@/model/receipt/model";
import { calculateBalances } from "@/app/receipt/utils/calculator";
import { t } from "@/app/i18n/translations";
import { ParticipantAvatar } from "@/components/ui/participant-avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { useParticipantsStore } from "@/app/receipt/store/participants";

interface SummaryScreenProps {
    receipt: ReceiptData;
    onBack: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
    receipt,
    onBack,
}) => {
    const participants = useParticipantsStore((s) => s.participants);
    const balances = useMemo(() => {
        const all = calculateBalances(receipt, participants);
        return all.filter(b => b.finalAmount > 0.01);
    }, [receipt, participants]);

    // Sum of distributed amounts
    const distributedTotal = useMemo(
        () => balances.reduce((acc, b) => acc + b.finalAmount, 0),
        [balances]
    );

    // Real receipt grand total (from API/model)
    // We need to trust receipt.totals.grandTotal
    // Note: calculateBalances applies a ratio based on receipt.totals.grandTotal / sum(positions).
    // So if all positions are claimed, distributedTotal ~= receipt.totals.grandTotal.
    // If not, there is a diff.
    const realGrandTotal = receipt.totals.grandTotal;
    const remaining = realGrandTotal - distributedTotal;

    const handleShare = () => {
        const lines = [
            `${t("receipt")}: ${realGrandTotal.toFixed(0)} ₽`,
            ...balances.map((b) => {
                const p = participants.find((p) => p.id === b.participantId);
                return `${p?.displayName || "Unknown"}: ${b.finalAmount.toFixed(0)} ₽`;
            }),
        ];
        if (Math.abs(remaining) > 1) {
            lines.push(`${t("remaining") || "Remaining"}: ${remaining.toFixed(0)} ₽`);
        }
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
                    {realGrandTotal.toFixed(0)} <span className="text-2xl text-muted-foreground">₽</span>
                </div>

                {/* Remaining Warning */}
                {Math.abs(remaining) > 1 && (
                    <div className={cn("mt-4 flex items-center justify-center gap-2 text-sm font-medium px-3 py-1 rounded-full",
                        remaining > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                        <AlertCircle className="h-4 w-4" />
                        {remaining > 0 ? (
                            `${t("remaining") || "Left to pay"}: ${remaining.toFixed(0)} ₽`
                        ) : (
                            `${t("overpaid") || "Overpaid"}: ${Math.abs(remaining).toFixed(0)} ₽`
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {balances.map((balance) => {
                    const participant = participants.find(
                        (p) => p.id === balance.participantId
                    );
                    if (!participant) return null;

                    return (
                        <div
                            key={balance.participantId}
                            className="flex flex-col w-full p-3 border rounded-lg bg-card"
                        >
                            <div className="flex items-center gap-3 w-full mb-2">
                                <ParticipantAvatar participant={participant} />
                                <span className="font-medium text-lg flex-1 text-left truncate">
                                    {participant.displayName}
                                </span>
                                <div className="text-right">
                                    <span className="font-bold text-xl block">
                                        {balance.finalAmount.toFixed(0)} ₽
                                    </span>
                                    {Math.abs(balance.finalAmount - balance.baseAmount) > 0.1 && (
                                        <span className="text-xs text-muted-foreground">
                                            {balance.baseAmount.toFixed(0)} {(balance.finalAmount - balance.baseAmount) > 0 ? "+" : "−"} {Math.abs(balance.finalAmount - balance.baseAmount).toFixed(0)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {balance.items.length > 0 && (
                                <div className="pl-12 w-full">
                                    <ul className="text-sm space-y-1 text-muted-foreground border-t pt-2 border-border/40">
                                        {balance.items.map((item, idx) => (
                                            <li key={idx} className="flex justify-between items-start py-1">
                                                <div className="overflow-hidden pr-2 flex-1">
                                                    <div className="truncate text-foreground">{item.positionName}</div>
                                                    {item.description && (
                                                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                                    )}
                                                </div>
                                                <span className="whitespace-nowrap font-medium">{item.rawAmount.toFixed(0)} ₽</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}

                {balances.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        {t("noClaims") || "No claims yet"}
                    </div>
                )}
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
