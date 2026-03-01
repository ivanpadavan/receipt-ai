import { SupabaseClient, User } from "@supabase/supabase-js";

type UpdateUserProfileInput = {
  supabase: SupabaseClient;
  user: User;
  displayName: string;
  avatarUrl?: string;
  avatarFile?: File;
};

export async function updateUserProfileServer({
  supabase,
  user,
  displayName,
  avatarUrl,
  avatarFile,
}: UpdateUserProfileInput) {
  if (!displayName.trim()) {
    throw new Error("Display name required");
  }

  let nextAvatarUrl = avatarUrl;

  if (avatarFile) {
    const extension = avatarFile.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    nextAvatarUrl = data.publicUrl;
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      displayName: displayName.trim(),
      avatarUrl: nextAvatarUrl,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { avatarUrl: nextAvatarUrl };
}

