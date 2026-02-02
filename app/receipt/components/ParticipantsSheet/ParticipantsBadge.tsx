"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Receipt } from "@/model/receipt/model";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParticipantsBadgeProps {
    onClick: () => void;
}

export const ParticipantsBadge: React.FC<ParticipantsBadgeProps> = ({ onClick }) => {
    const form = useFormContext<Receipt>();
    const participants = useWatch({
        control: form.control,
        name: "participants",
    });

    const count = participants?.length || 0;

    return (
        <Button
            variant="outline"
            onClick={onClick}
            title="Участники"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 font-medium transition-all duration-200 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5 hover:shadow-md"
        >
            <Users className="w-[1.125rem] h-[1.125rem]" />
            <span className="text-sm font-semibold min-w-[1.25rem] text-center">{count}</span>
        </Button>
    );
};
