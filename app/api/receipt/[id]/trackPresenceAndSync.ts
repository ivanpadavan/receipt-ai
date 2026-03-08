interface PresenceTrackChannel {
  track: (payload: { userId: string }) => Promise<unknown>;
}

export async function trackPresenceAndSync(
  channel: PresenceTrackChannel,
  userId: string,
  syncPresenceState: () => void,
) {
  await channel.track({ userId });
  syncPresenceState();
}
