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

      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file, file.name);

      const tokenResult = await authClient.convex.token();
      const token = tokenResult?.data?.token;
      if (!token) {
        throw new Error("NOT_AUTHENTICATED: Missing auth token");
      }

      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/media/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { publicUrl?: string; key?: string; error?: string; details?: string }
        | null;

      if (!response.ok) {
        const details = data?.details || data?.error || `Upload failed with status ${response.status}`;
        throw new Error(`UPLOAD_FAILED: ${details}`);
      }

      if (!data?.publicUrl || !data?.key) {
        throw new Error("UPLOAD_FAILED: Invalid upload response");
      }

      return {
        url: data.publicUrl,
        key: data.key,
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
