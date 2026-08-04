import { NextResponse, type NextRequest } from "next/server";

import { isAuthConfigured, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    // 本番で設定漏れがあれば、開けっ放しにせず止める
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "APP_PASSWORD と APP_SECRET が設定されていません。環境変数を設定してください。",
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
    // ローカル開発では素通しする
    return NextResponse.next();
  }

  const authenticated = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const onLoginPage = request.nextUrl.pathname === "/login";

  if (!authenticated && !onLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authenticated && onLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 静的ファイルと画像最適化は対象外
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
