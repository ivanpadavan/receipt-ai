"use client";

import { createContext, useContext } from "react";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User
}) => {

    return (
        <AuthContext.Provider value={{ user: initialUser }}>
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
