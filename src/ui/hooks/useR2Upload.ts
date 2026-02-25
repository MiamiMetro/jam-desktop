import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export type R2UploadKind = "avatar" | "banner" | "audio";

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (kind: R2UploadKind, file: File) => {
    setIsUploading(true);
    try {
      const baseUrl = import.meta.env.VITE_CONVEX_SITE_URL;
      if (!baseUrl) {
        throw new Error("UPLOAD_CONFIG_MISSING: VITE_CONVEX_SITE_URL is not configured");
      }

      const tokenResult = await authClient.convex.token();
      const token = tokenResult?.data?.token;
      if (!token) {
        throw new Error("NOT_AUTHENTICATED: Missing auth token");
      }

      const initResponse = await fetch(`${baseUrl.replace(/\/+$/, "")}/media/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const data = (await initResponse.json().catch(() => null)) as
        | {
            uploadSessionId?: string;
            uploadUrl?: string;
            method?: "PUT";
            headers?: Record<string, string>;
            publicUrl?: string;
            key?: string;
            error?: string;
            details?: string;
          }
        | null;

      if (!initResponse.ok) {
        const details =
          data?.details || data?.error || `Upload failed with status ${initResponse.status}`;
        throw new Error(`UPLOAD_FAILED: ${details}`);
      }

      if (!data?.uploadSessionId || !data?.uploadUrl || !data?.publicUrl || !data?.key) {
        throw new Error("UPLOAD_FAILED: Invalid upload response");
      }

      const uploadResponse = await fetch(data.uploadUrl, {
        method: data.method ?? "PUT",
        headers: data.headers ?? {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        const details = await uploadResponse.text().catch(() => "");
        throw new Error(
          `UPLOAD_FAILED: ${details || `Storage returned status ${uploadResponse.status}`}`
        );
      }

      const finalizeResponse = await fetch(`${baseUrl.replace(/\/+$/, "")}/media/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uploadSessionId: data.uploadSessionId,
        }),
      });

      const finalized = (await finalizeResponse.json().catch(() => null)) as
        | {
            publicUrl?: string;
            key?: string;
            error?: string;
            details?: string;
          }
        | null;

      if (!finalizeResponse.ok) {
        const details =
          finalized?.details ||
          finalized?.error ||
          `Finalize failed with status ${finalizeResponse.status}`;
        throw new Error(`UPLOAD_FINALIZE_FAILED: ${details}`);
      }

      if (!finalized?.publicUrl) {
        throw new Error("UPLOAD_FINALIZE_FAILED: Invalid finalize response");
      }

      return {
        url: finalized.publicUrl,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
  };
}
