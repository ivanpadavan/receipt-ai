'use server'
import { signIn } from '../app/auth'

export async function SignIn(...args: Parameters<typeof signIn>) {
  return await signIn(...args);
}
