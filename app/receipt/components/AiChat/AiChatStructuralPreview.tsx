"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/app/receipt/components/ui/ReceiptCard";
import { useMoneyFormatter, useReceiptState } from "@/app/receipt/components/receipt-context";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { cn } from "@/utils/cn";
import {
  textVariants,
  rowVariants,
  stackGapVariants,
} from "@/app/receipt/components/ui-styles";
import { t } from "@/app/i18n/translations";
import type { Receipt } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";
import {
  buildStructuralLossWarnings,
  buildStructuralModifierDiffs,
  buildStructuralPositionDiffs,
  buildStructuralTotalsDiffs,
  type DiffEntry,
  type StructuralLossWarning,
} from "@/app/receipt/components/AiChat/structural-apply";

type StructuralReceipt = Extract<
  ReceiptChatResponse,
  { type: "structural_preview" }
>["receipt"];

interface AiChatStructuralPreviewProps {
  receipt: StructuralReceipt;
  onApply?: () => void;
}

const diffStatusStyles = {
  unchanged: "border-border/40 bg-background/70",
  added: "border-emerald-300/70 bg-emerald-50/70",
  removed: "border-rose-300/70 bg-rose-50/70",
  changed: "border-amber-300/80 bg-amber-50/70",
};

function formatPositionSummary(
  position: StructuralReceipt["positions"][number],
  currencySymbol: string,
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  return `${position.quantity} × ${formatMoney(position.price, currencySymbol)} = ${formatMoney(position.overall, currencySymbol)}`;
}

function formatModifierSummary(
  modifier: StructuralReceipt["fees"][number] | StructuralReceipt["discounts"][number],
  currencySymbol: string,
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  return formatMoney(modifier.value, currencySymbol);
}

function formatTotalsSummary(
  value: number,
  currencySymbol: string,
  formatMoney: (value: number, currencySymbolOverride?: string) => string,
) {
  return formatMoney(value, currencySymbol);
}

function DiffSection<T>({
  title,
  diffs,
  renderLabel,
  renderSummary,
  renderValue,
}: {
  title?: string;
  diffs: DiffEntry<T>[];
  renderLabel: (entry: DiffEntry<T>) => string;
  renderSummary: (entry: DiffEntry<T>) => { current?: string; next?: string };
  renderValue: (entry: DiffEntry<T>) => { current?: string; next?: string };
}) {
  if (diffs.length === 0) {
    return null;
  }

  return (
    <div className={stackGapVariants({ size: "xs" })}>
      {title && (<div className={textVariants({ size: "sm", weight: "medium", tone: "muted" })}>
        {title}
      </div>)}
      {diffs.map((entry) => {
        const label = renderLabel(entry);
        const summary = renderSummary(entry);
        const value = renderValue(entry);

        return (
          <div
            key={`${title}-${entry.index}`}
            className={cn(
              "rounded-2xl border px-3 py-2",
              diffStatusStyles[entry.status],
            )}
          >
            <div
              className={cn(
                rowVariants({
                  align: "center",
                  justify: "between",
                  width: "full",
                }),
                "gap-3",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {entry.status !== "unchanged" && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        entry.status === "added" &&
                          "bg-emerald-200/80 text-emerald-900",
                        entry.status === "removed" &&
                          "bg-rose-200/80 text-rose-900",
                        entry.status === "changed" &&
                          "bg-amber-200/80 text-amber-950",
                      )}
                    >
                      {entry.status === "added"
                        ? t("aiChatStructuralPreviewAdded")
                        : entry.status === "removed"
                          ? t("aiChatStructuralPreviewRemoved")
                          : t("aiChatStructuralPreviewChanged")}
                    </span>
                  )}
                  <div
                    className={textVariants({ size: "sm", weight: "semibold" })}
                  >
                    {label}
                  </div>
                </div>
                {(summary.current || summary.next) && (
                  <div className={textVariants({ size: "xs", tone: "muted" })}>
                    {entry.status === "changed" ? (
                      <>
                        {summary.current && (
                          <span className="line-through opacity-70">
                            {summary.current}
                          </span>
                        )}
                        {summary.next && (
                          <span className="ml-2 font-medium text-foreground">
                            {summary.next}
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        className={cn(
                          entry.status === "removed" &&
                            "line-through opacity-70",
                          entry.status === "added" &&
                            "font-medium text-foreground",
                        )}
                      >
                        {summary.next ?? summary.current}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {(value.current || value.next) && (
                <div
                  className={cn(
                    "shrink-0 text-right",
                    textVariants({ size: "sm", weight: "semibold" }),
                  )}
                >
                  {entry.status === "changed" ? (
                    <div className="space-y-0.5">
                      {value.current && (
                        <div className="text-xs font-normal text-muted-foreground line-through">
                          {value.current}
                        </div>
                      )}
                      {value.next && <div>{value.next}</div>}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        entry.status === "removed" && "line-through opacity-70",
                        entry.status === "added" && "text-foreground",
                      )}
                    >
                      {value.next ?? value.current}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AiChatLossWarningBlock({
  title,
  description,
  warnings,
}: {
  title: string;
  description: string;
  warnings: StructuralLossWarning[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={textVariants({ size: "sm", weight: "semibold" })}>
            {title}
          </div>
          <div className={textVariants({ size: "xs", tone: "muted" })}>
            {description}
          </div>
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li
                key={warning.id}
                className={cn(
                  "rounded-xl bg-white/70 px-3 py-2",
                  textVariants({ size: "sm" }),
                )}
              >
                {warning.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export const AiChatStructuralPreview: React.FC<AiChatStructuralPreviewProps> = ({
  receipt,
  onApply,
}) => {
  const { currencySymbol, formatMoney } = useMoneyFormatter();
  const { scenario } = useReceiptState();
  const participants = useParticipantsStore((state) => state.participants);
  const currentReceipt = scenario.form.getValues() as Receipt;
  const receiptCurrency = receipt.meta.currencySymbol ?? currencySymbol;
  const title = receipt.meta.title ?? t("receipt");
  const currentTitle = currentReceipt.meta.title ?? t("receipt");

  const positionDiffs = buildStructuralPositionDiffs(currentReceipt.positions, receipt.positions);
  const feeDiffs = buildStructuralModifierDiffs(currentReceipt.fees, receipt.fees);
  const discountDiffs = buildStructuralModifierDiffs(currentReceipt.discounts, receipt.discounts);
  const totalDiffs = buildStructuralTotalsDiffs(currentReceipt.totals, receipt.totals);
  const warnings = buildStructuralLossWarnings(
    currentReceipt,
    receipt,
    participants,
    receiptCurrency,
    formatMoney,
  );
  const hasStructuralChanges =
    currentTitle !== title ||
    positionDiffs.some((entry) => entry.status !== "unchanged") ||
    feeDiffs.some((entry) => entry.status !== "unchanged") ||
    discountDiffs.some((entry) => entry.status !== "unchanged") ||
    totalDiffs.some((entry) => entry.status !== "unchanged");

  return (
    <ReceiptCard
      shadow="sm"
      radius="xl"
      tone={hasStructuralChanges ? "soft" : "success"}
      className="overflow-hidden"
    >
      <div className="p-4">
        <div className={cn("mb-4", stackGapVariants({ size: "lg" }))}>
          <div className={textVariants({ size: "lg", weight: "semibold" })}>
            {currentTitle === title ? (
              title
            ) : (
              <>
                <span className="line-through opacity-70">{currentTitle}</span>
                <span className="ml-2">{title}</span>
              </>
            )}
          </div>
        </div>

        <div className={stackGapVariants({ size: "sm" })}>
          <DiffSection
            title={t("positions")}
            diffs={positionDiffs}
            renderLabel={(entry) =>
              (entry.next ?? entry.current)?.name ?? t("positions")
            }
            renderSummary={(entry) => {
              const current = entry.current
                ? formatPositionSummary(
                    entry.current,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined;
              const next = entry.next
                ? formatPositionSummary(
                    entry.next,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined;
              return { current, next };
            }}
            renderValue={(entry) => {
              const current = entry.current
                ? formatMoney(entry.current.overall, receiptCurrency)
                : undefined;
              const next = entry.next
                ? formatMoney(entry.next.overall, receiptCurrency)
                : undefined;
              return { current, next };
            }}
          />

          <DiffSection
            title={t("fees")}
            diffs={feeDiffs}
            renderLabel={(entry) =>
              (entry.next ?? entry.current)?.name ?? t("fees")
            }
            renderSummary={(entry) => ({
              current: entry.current
                ? formatModifierSummary(
                    entry.current,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatModifierSummary(
                    entry.next,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
            renderValue={(entry) => ({
              current: entry.current
                ? formatModifierSummary(
                    entry.current,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatModifierSummary(
                    entry.next,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
          />

          <DiffSection
            title={t("discounts")}
            diffs={discountDiffs}
            renderLabel={(entry) =>
              (entry.next ?? entry.current)?.name ?? t("discounts")
            }
            renderSummary={(entry) => ({
              current: entry.current
                ? formatModifierSummary(
                    entry.current,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatModifierSummary(
                    entry.next,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
            renderValue={(entry) => ({
              current: entry.current
                ? formatModifierSummary(
                    entry.current,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatModifierSummary(
                    entry.next,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
          />

          <DiffSection
            title={t("total")}
            diffs={totalDiffs}
            renderLabel={() => t("total")}
            renderSummary={(entry) => ({
              current: entry.current
                ? formatTotalsSummary(
                    entry.current.total,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatTotalsSummary(
                    entry.next.total,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
            renderValue={(entry) => ({
              current: entry.current
                ? formatTotalsSummary(
                    entry.current.grandTotal,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
              next: entry.next
                ? formatTotalsSummary(
                    entry.next.grandTotal,
                    receiptCurrency,
                    formatMoney,
                  )
                : undefined,
            })}
          />

          {onApply && hasStructuralChanges && (
            <Button type="button" onClick={onApply} className="w-full">
              {t("aiChatApplyBtnText")}
            </Button>
          )}
        </div>
      </div>
    </ReceiptCard>
  );
};
