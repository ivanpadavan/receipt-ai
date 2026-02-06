"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";

interface AuthContextType {
    user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

const appendAnonymousUserName = (user: User): User => {
  console.log(user.user_metadata, user.user_metadata.displayName);
  if (!user.user_metadata || !user.user_metadata.displayName) {
    user.user_metadata = Object.assign(user.user_metadata || {}, {
      displayName: "Anonymous",
    });
  }
  return user;
}

export const AuthProvider = ({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User
}) => {
    const [user, setUser] = useState(appendAnonymousUserName(initialUser));

    useEffect(() => {

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_: AuthChangeEvent, session: Session | null) => {
              console.log(session);
              if (session?.user) setUser(appendAnonymousUserName({ ...session.user, user_metadata: initialUser.user_metadata }));
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
