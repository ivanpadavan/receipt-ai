import { UserMetadata } from "@supabase/supabase-js";

type UpdateUserProfileValues = UserMetadata & { avatarFile?: File };

export async function updateUserProfileClient(values: UpdateUserProfileValues) {
  const formData = new FormData();
  formData.set("displayName", values.displayName?.trim() || "");

  if (typeof values.avatarUrl === "string") {
    formData.set("avatarUrl", values.avatarUrl);
  }
  if (values.avatarFile) {
    formData.set("avatarFile", values.avatarFile);
  }

  const response = await fetch("/api/settings/profile", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || "Failed to update profile");
  }

  return response.json();
}

