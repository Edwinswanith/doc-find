import { cookies } from "next/headers"
import { PrototypeApp } from "@/components/PrototypeApp"
import { COOKIE_NAME, readPrototypeCookie } from "@/lib/prototype-session"

export default async function Home() {
  const cookieStore = await cookies()
  const initialUser = readPrototypeCookie(cookieStore.get(COOKIE_NAME)?.value)
  return <PrototypeApp initialUser={initialUser} />
}
