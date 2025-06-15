'use server'
import { signOut } from '../app/auth'

export async function SignOut(...args: Parameters<typeof signOut>) {
  return await signOut(...args);
}
