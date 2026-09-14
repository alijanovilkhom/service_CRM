import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

function isPublicApi(pathname: string): boolean {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/leads/inbound" ||
    pathname === "/api/feedback"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role;

    const isUsersPath =
      pathname === "/users" ||
      pathname.startsWith("/users/") ||
      pathname === "/api/users" ||
      pathname.startsWith("/api/users/");

    if (isUsersPath && role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/clients/:path*",
    "/tasks/:path*",
    "/users/:path*",
    "/profile",
    "/profile/:path*",
    "/api/:path*",
  ],
};
