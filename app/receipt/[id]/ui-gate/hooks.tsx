import React, { useMemo } from "react";
import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";
import { useUser } from "@/context/AuthContext";
import { useParticipantsStore } from "@/app/receipt/store/participants";
import { checkUiGate } from "@/app/receipt/[id]/ui-gate/functions";
import { joinToReciept } from "@/app/receipt/[id]/ui-gate/join-to-receipt-csr";
import { SettingsDialog } from "@/app/receipt/[id]/ui-gate/settings-dialog";
import { useRouter } from "next/navigation";
import { RemovedDialog } from "@/app/receipt/[id]/ui-gate/removed-dialog";
import { useHookToObservable } from "@/hooks/rx/useHookToObservable";
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  Observable,
  pairwise,
  scan,
  startWith,
} from "rxjs";

type GateState = "join" | "settings" | "nothing";

export function useUiGate(
  formType: FormScenario["type"],
  receiptId: string,
): Observable<React.ReactNode> {
  const { user } = useUser();
  const participants = useParticipantsStore((s) => s.participants);
  const router = useRouter();

  const user$ = useHookToObservable(user);
  const participants$ = useHookToObservable(participants, (a, b) => a === b);
  const formType$ = useHookToObservable(formType);

  return useMemo(() => {
    const joined$ = combineLatest([participants$, user$]).pipe(
      map(([ps, u]) => ps.some((p) => p.id === u.id)),
      startWith(false),
      distinctUntilChanged(),
    );

    const removedOpen$ = joined$.pipe(
      pairwise(),
      scan((open, [prev, curr]) => open || (prev === true && curr === false), false),
      startWith(false),
      distinctUntilChanged(),
    );

    const gate$ = combineLatest([participants$, user$, formType$]).pipe(
      map(([ps, u, type]) => checkUiGate(ps, u, type) as GateState),
      distinctUntilChanged(),
    );

    const join$ = gate$.pipe(
      filter((state) => state === "join"),
      exhaustMap(() =>
        from(joinToReciept(receiptId)).pipe(
          catchError(() => EMPTY),
          ignoreElements(),
        ),
      ),
    );

    const ui$ = combineLatest([gate$, removedOpen$]).pipe(
      map(([gate, removedOpen]) => {
        if (removedOpen) return <RemovedDialog onGoHome={() => router.push("/")} />;
        if (gate === "settings") return <SettingsDialog />;
        return <></>;
      }),
    );

    return merge(ui$, join$);
  }, [participants$, user$, formType$, receiptId, router]);
}
