'use server'
import { signIn } from '../app/auth'

export async function SignIn() {
  return await signIn();
}
