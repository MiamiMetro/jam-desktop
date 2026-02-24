import { httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

declare const process: {
  env: Record<string, string | undefined>;
};

const UPLOAD_LIMITS = {
  avatar: 5 * 1024 * 1024,
  banner: 8 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
} as const;

const DEFAULT_EXTENSIONS = {
  avatar: ".jpg",
  banner: ".jpg",
  audio: ".webm",
} as const;

type UploadKind = keyof typeof UPLOAD_LIMITS;

const siteUrls = [process.env.SITE_URL, process.env.VITE_SITE_URL]
  .filter((value): value is string => !!value)
  .flatMap((value) => value.split(",").map((url) => url.trim()))
  .filter((value) => value.length > 0);

const trustedOrigins =
  siteUrls.length > 0 ? siteUrls : ["http://localhost:5173", "http://localhost:5123"];

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  data: string
): Promise<ArrayBuffer> {
  const source = key instanceof Uint8Array ? key : new Uint8Array(key);
  const keyBytes = new Uint8Array(source.byteLength);
  keyBytes.set(source);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data)
  );
  return signature;
}

function getTimestampFields(now: Date) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function normalizeFileExtension(filename: string, fallback: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return fallback;
  const raw = filename.slice(dot).toLowerCase();
  if (!/^\.[a-z0-9]{1,10}$/.test(raw)) return fallback;
  return raw;
}

function validateUpload(kind: UploadKind, contentType: string, fileSize: number) {
  const normalizedType = contentType.toLowerCase();

  if ((kind === "avatar" || kind === "banner") && !normalizedType.startsWith("image/")) {
    throw new Error(`INVALID_FILE_TYPE: ${kind === "avatar" ? "Avatar" : "Banner"} must be an image`);
  }
  if (kind === "audio" && !normalizedType.startsWith("audio/")) {
    throw new Error("INVALID_FILE_TYPE: Audio upload must be an audio file");
  }

  const maxSize = UPLOAD_LIMITS[kind];
  if (fileSize <= 0 || fileSize > maxSize) {
    throw new Error(`FILE_TOO_LARGE: Max upload size is ${Math.floor(maxSize / (1024 * 1024))}MB`);
  }
}

function isUploadKind(value: string): value is UploadKind {
  return value === "avatar" || value === "banner" || value === "audio";
}

function isAllowedOrigin(origin: string): boolean {
  if (trustedOrigins.includes(origin)) return true;
  return /^http:\/\/localhost:\d+$/.test(origin);
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!origin || !isAllowedOrigin(origin)) return headers;
  headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Credentials"] = "true";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  headers["Vary"] = "Origin";
  return headers;
}

function parseUploadError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "UPLOAD_FAILED: Unknown error";
  const match = raw.match(/^[A-Z_]+:\s*(.*)$/);
  return match?.[1] ?? raw;
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_PUBLIC;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error("R2_CONFIG_MISSING: R2 env vars are not fully configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

async function buildSignedUpload(params: {
  kind: UploadKind;
  filename: string;
  contentType: string;
  profileId: string;
}) {
  const { kind, filename, contentType, profileId } = params;
  const { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl } = getR2Config();

  const extension = normalizeFileExtension(filename, DEFAULT_EXTENSIONS[kind]);
  const randomPart = Math.random().toString(36).slice(2, 10);
  const key = `${kind}/${profileId}/${Date.now()}-${randomPart}${extension}`;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;
  const canonicalUri = `/${bucket}/${key
    .split("/")
    .map((part) => encodeRfc3986(part))
    .join("/")}`;

  const now = new Date();
  const { amzDate, dateStamp } = getTimestampFields(now);
  const region = "auto";
  const service = "s3";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const queryParams: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "900"],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQuery = queryParams
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${secretAccessKey}`),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const uploadUrl = `${endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  const normalizedPublicBase = publicBaseUrl.replace(/\/+$/, "");
  const publicUrl = `${normalizedPublicBase}/${key}`;

  return {
    uploadUrl,
    publicUrl,
    key,
    expiresInSeconds: 900,
    method: "PUT" as const,
    headers: {
      "Content-Type": contentType,
    },
  };
}

export const getProfileByAuthIdentity = internalQuery({
  args: {
    authIssuer: v.string(),
    authSubject: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_auth_identity", (q) =>
        q.eq("authIssuer", args.authIssuer).eq("authSubject", args.authSubject)
      )
      .first();
  },
});

export const uploadFromAppOptions = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }), {
      status: 403,
      headers: buildCorsHeaders(origin),
    });
  }
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
});

export const uploadFromApp = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(JSON.stringify({ error: "NOT_AUTHENTICATED" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const profile = await ctx.runQuery(internal.media.getProfileByAuthIdentity, {
      authIssuer: identity.issuer,
      authSubject: identity.subject,
    });

    if (!profile) {
      return new Response(JSON.stringify({ error: "PROFILE_REQUIRED" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const formData = await request.formData();
    const kindInput = `${formData.get("kind") ?? ""}`.trim().toLowerCase();
    if (!isUploadKind(kindInput)) {
      return new Response(JSON.stringify({ error: "INVALID_KIND" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "FILE_REQUIRED" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const filename =
      ("name" in file && typeof file.name === "string" && file.name.length > 0)
        ? file.name
        : `upload${DEFAULT_EXTENSIONS[kindInput]}`;
    const contentType =
      ("type" in file && typeof file.type === "string" && file.type.length > 0)
        ? file.type
        : "application/octet-stream";
    const fileSize = "size" in file && typeof file.size === "number" ? file.size : 0;

    validateUpload(kindInput, contentType, fileSize);

    const signed = await buildSignedUpload({
      kind: kindInput,
      filename,
      contentType,
      profileId: profile._id,
    });

    const uploadResponse = await fetch(signed.uploadUrl, {
      method: signed.method,
      headers: signed.headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: "UPLOAD_FAILED",
          details: details || `R2 returned status ${uploadResponse.status}`,
        }),
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    return new Response(
      JSON.stringify({
        publicUrl: signed.publicUrl,
        key: signed.key,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "UPLOAD_FAILED",
        details: parseUploadError(error),
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
