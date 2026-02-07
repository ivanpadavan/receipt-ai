const PARTICIPANT_COLORS = [
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
];

export const getNextColor = (participants: { color?: string | null }[]) => {
  const used = new Set(
    participants.map((p) => p.color).filter((c): c is string => !!c),
  );
  const available = PARTICIPANT_COLORS.find((c) => !used.has(c));
  return (
    available ||
    PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length]
  );
};
