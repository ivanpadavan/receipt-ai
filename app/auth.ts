import { ANONYMOUS_NAME } from "@/utils/auth-consts";
import { ProfileCallback } from "@auth/core/providers";
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

const oauthProviders = [
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
  })
].map((config) => {
  const profile: ProfileCallback<any> = async (...args) => {
    console.log('[auth] profile', { config, args });
    let user: User;
    if (!config.profile) {
      console.error('oauth provider config do not have a profile callback. Falling back to google');
      user = {
        id: args[0].sub,
        name: args[0].name,
        email: args[0].email,
        image: args[0].picture,
      }
    }
    const currentAuth = await auth();
    if (!currentAuth) {
      throw new Error('oauth login can be used only after anonymous auth');
    }
    // @ts-ignore
    return user || config.profile && await config.profile(...args);
  };
  return {
    ...config,
    profile
  }
});

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
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
