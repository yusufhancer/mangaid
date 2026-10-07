import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path ? path.join("/") : "";
  const targetUrl = new URL(`/api/${pathStr}`, BACKEND_URL);
  targetUrl.search = request.nextUrl.search;

  try {
    const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
    const body = isBodyAllowed ? await request.arrayBuffer() : undefined;

    const headers = new Headers();
    request.headers.forEach((val, key) => {
      if (key.toLowerCase() !== "host") {
        headers.set(key, val);
      }
    });
    headers.set("host", targetUrl.host);

    const resp = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
      // @ts-ignore
      duplex: "half",
    });

    const respHeaders = new Headers();
    resp.headers.forEach((val, key) => {
      respHeaders.set(key, val);
    });

    const respBody = await resp.arrayBuffer();

    return new NextResponse(respBody, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  } catch (err: any) {
    console.error("[Next.js API Proxy Error]", err);
    return NextResponse.json(
      { detail: `Gagal menghubungi server backend: ${err.message || String(err)}` },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
