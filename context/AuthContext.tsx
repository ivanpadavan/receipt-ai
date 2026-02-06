"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";

interface AuthContextType {
  user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User;
}) => {
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_: AuthChangeEvent, session: Session | null) => {
        if (session?.user) setUser(session.user);
        else window.location.reload();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context;
};
