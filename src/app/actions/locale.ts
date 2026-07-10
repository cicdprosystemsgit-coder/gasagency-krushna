"use server";

import { cookies } from "next/headers";

export async function setLocaleCookie(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: "lax",
  });
  cookieStore.set("googtrans", "", {
    path: "/",
    maxAge: 0, // clear google translate cookie
    sameSite: "lax",
  });
}

export async function setGoogleTranslateCookie(langCode: string) {
  const cookieStore = await cookies();
  cookieStore.set("googtrans", `/en/${langCode}`, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}
