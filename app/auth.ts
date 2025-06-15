import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import VKProvider from "next-auth/providers/vk";
import YandexProvider from "next-auth/providers/yandex";
import { db } from "@/app/db";

const adapter = PrismaAdapter(db) as Required<ReturnType<typeof PrismaAdapter>>;

const upgradedUserIds = new Set<string>();

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
          name: `Anonymous User`,
          email: `${id}@gmail.com`,
          emailVerified: null,
          isAnonymous: true,
        };
        console.log(`[auth] new anonymous user created`, user);
        return adapter.createUser(user);
      },
    }),
    // OAuth providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID as string,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET as string,
    }),
    VKProvider({
      clientId: process.env.VK_CLIENT_ID as string,
      clientSecret: process.env.VK_CLIENT_SECRET as string,
    }),
    YandexProvider({
      clientId: process.env.YANDEX_CLIENT_ID as string,
      clientSecret: process.env.YANDEX_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) {
        throw new Error("No account");
      }

      if (account.provider === "anonymous") {
        return true;
      }
      const currentAuth = await auth();

      if (!currentAuth) {
        throw new Error("Not anonymous auth while using provider");
      }
      console.log('[auth] signin', { user, account, currentAuth });

      const existingUser = currentAuth.user;

      const existingLinking = await db.account.findUnique({
        where: { provider_providerAccountId: {
            providerAccountId: account.providerAccountId,
            provider: account.provider },
        },
      });

      if (existingLinking) {
        console.log(`[auth] linking already presented. Should login to linked account.`, user);
        return '/';
      }

      const userUpdateData = {
        isAnonymous: false,
        name: user.name || existingUser.name,
        image: user.image || existingUser.image,
        email: user.email || existingUser.email,
      };
      console.log(`[auth] update scheduled`, userUpdateData);
      const [newAccount, updatedUser] = await db.$transaction([
        db.account.create({
          data: {
            userId: existingUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        }),
        db.user.update({
          where: { id: existingUser.id },
          data: userUpdateData,
        }),
      ]);

      console.log(`[auth] new account linked and user updated`, { newAccount, updatedUser });

      return '/'
    },
    async jwt({ token, user, account }) {
      console.log('[auth] jwt', { token, user, account });
      if (!user && (upgradedUserIds.has(token.user.id || '') || true )) {
        const actualUser = await db.user.findUnique({
          where: { id: token.user.id || '' },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isAnonymous: true,
          }
        });
        if (actualUser) {
          user = actualUser;
        }
        console.log('[auth] user update in JWT', { user });
      }
      // Add isAnonymous flag to the token
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.user = user;
      }
      console.log('[auth] jwt result', token);
      return token;
    },
    async session({ session, token }) {
      console.log('[auth] session', { session, token });
      // Add isAnonymous flag and user ID to the session
      session.user = token.user;
      console.log('[auth] session result', session);
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
