import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's ID */
      id: string;
      /** Whether the user is anonymous */
      isAnonymous: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    /** Whether the user is anonymous */
    isAnonymous?: boolean;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's ID */
    id: string;
    /** Whether the user is anonymous */
    isAnonymous: boolean;
  }
}
