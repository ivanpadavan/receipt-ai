import { ANONYMOUS_NAME } from "@/utils/auth-consts";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { db } from "@/app/db";

const adapter = PrismaAdapter(db) as Required<ReturnType<typeof PrismaAdapter>>;

const upgradedUserIds = new Set<string>();

const oauthProviders = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Facebook({
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  }),
];

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    // Anonymous authentication
    CredentialsProvider({
      id: "anonymous",
      name: "Anonymous",
      credentials: {},
      async authorize() {
        // Create an anonymous user
        const id = Math.random().toString().slice(2);
        const user = {
          id,
          name: ANONYMOUS_NAME,
          email: `${id}@gmail.com`,
          emailVerified: null,
        };
        console.log(`[auth] new anonymous user created`, user);
        return adapter.createUser(user);
      },
    }),
    ...oauthProviders,
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('[auth] jwt', { token, user, account });
      if (!user && (upgradedUserIds.has(token.user.id || '') )) {
        const actualUser = await db.user.findUnique({
          where: { id: token.user.id || '' },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        });
        if (actualUser) {
          user = actualUser;
        }
        // console.log('[auth] user update in JWT', { user });
      }
      if (user) {
        const partialUser = {name: user.name, email: user.email, image: user.image};
        Object.assign(token, partialUser);
        token.user = user;
      }
      // console.log('[auth] jwt result', token);
      return token;
    },
    async session({ session, token }) {
      session.user = token.user;
      return session;
    },
  },
  events: {
    linkAccount: async (v) => {
      console.log('[auth] link account', v);
      if (v.user.name !== ANONYMOUS_NAME) {
        return;
      }
      upgradedUserIds.add(<string>v.user.id);
      await db.user.update({
        where: { id: v.user.id },
        data: {
          name: v.profile.name,
          email: v.profile.email,
          image: v.profile.image,
        }
      });
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
});
