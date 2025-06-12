import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram";
import VKProvider from "next-auth/providers/vk";
import YandexProvider from "next-auth/providers/yandex";
import { db } from "@/app/db";

const adapter = PrismaAdapter(db) as Required<ReturnType<typeof PrismaAdapter>>;

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
    async signIn({ user, account, profile }) {
      // If this is an OAuth sign-in
      if (account && account.provider !== "anonymous") {
        try {
          // Check if there's an anonymous user with the same email
          const existingUser = await db.user.findUnique({
            where: { email: user.email as string },
            include: { accounts: true },
          });

          // If there's an existing anonymous user
          if (existingUser && existingUser.isAnonymous) {
            // Update the user to no longer be anonymous
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                isAnonymous: false,
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            });

            // Link the new account to the existing user
            if (account.provider && account.providerAccountId) {
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: null,
                },
              });
            }

            // Set the user ID to the existing user's ID
            user.id = existingUser.id;
          }
        } catch (error) {
          console.error("Error during account linking:", error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Add isAnonymous flag to the token
      if (user) {
        token.isAnonymous = (user as any).isAnonymous || false;
        token.id = <string>user.id;
      }

      // If this is an OAuth sign-in, update the token to not be anonymous
      if (account && account.provider !== "anonymous") {
        token.isAnonymous = false;
      }

      return token;
    },
    async session({ session, token }) {
      // Add isAnonymous flag and user ID to the session
      session.user.isAnonymous = token.isAnonymous;
      session.user.id = token.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
