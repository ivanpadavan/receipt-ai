import type { User } from "@supabase/supabase-js";

export const getUserName = (user: User) => user?.user_metadata?.name || user?.email || "Anonymous";
