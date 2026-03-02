import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { useR2Upload } from "@/hooks/useR2Upload";

// Community type inferred from Convex backend
type CommunityQueryReturn = FunctionReturnType<typeof api.communities.getByHandle>;
export type Community = NonNullable<CommunityQueryReturn>;

type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

// ============================================
// Queries
// ============================================

export const useCommunities = (filters?: { tag?: string; search?: string }) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.listPaginated,
    { tag: filters?.tag, search: filters?.search },
    { initialNumItems: 20 }
  );

  return {
    data: results as Community[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useCommunity = (handle: string) => {
  const result = useQuery(
    api.communities.getByHandle,
    handle ? { handle } : "skip"
  );

  return {
    data: result ?? null,
    isLoading: result === undefined && !!handle,
  };
};

export const useCommunityById = (communityId: string) => {
  const result = useQuery(
    api.communities.getById,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip"
  );

  return {
    data: result ?? null,
    isLoading: result === undefined && !!communityId,
  };
};

export const useJoinedCommunities = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.getJoined,
    {},
    { initialNumItems: 50 }
  );

  return {
    data: results as Community[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    fetchNextPage: () => loadMore(50),
  };
};

export const useMemberRole = (communityId: string) => {
  const result = useQuery(
    api.communities.getMemberRole,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip"
  );

  return result ?? null;
};

export const useCommunityMembers = (communityId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.getMembersPaginated,
    communityId ? { communityId: communityId as Id<"communities"> } : "skip",
    { initialNumItems: 30 }
  );

  return {
    data: results,
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    fetchNextPage: () => loadMore(30),
  };
};

export const useSearchCommunityMembers = (communityId: string, username: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.searchMembersPaginated,
    communityId && username.length >= 2
      ? { communityId: communityId as Id<"communities">, username }
      : "skip",
    { initialNumItems: 20 }
  );

  return {
    data: results,
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useCommunityCreatedCount = () => {
  const result = useQuery(api.communities.getCreatedCount, {});
  return result ?? 0;
};

// ============================================
// Mutations
// ============================================

export const useCreateCommunity = () => {
  const createMutation = useMutation(api.communities.create);
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    name: string;
    handle: string;
    description?: string;
    themeColor: string;
    tags: string[];
    avatarFile?: File | null;
    bannerFile?: File | null;
  }) => {
    setIsPending(true);
    try {
      let avatarUrl: string | undefined;
      let bannerUrl: string | undefined;

      if (variables.avatarFile) {
        const uploaded = await uploadFile("avatar", variables.avatarFile);
        avatarUrl = uploaded.url;
      }
      if (variables.bannerFile) {
        const uploaded = await uploadFile("banner", variables.bannerFile);
        bannerUrl = uploaded.url;
      }

      return await createMutation({
        name: variables.name,
        handle: variables.handle,
        description: variables.description,
        themeColor: variables.themeColor,
        tags: variables.tags,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useUpdateCommunity = () => {
  const updateMutation = useMutation(api.communities.update);
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    communityId: string;
    name?: string;
    description?: string;
    themeColor?: string;
    tags?: string[];
    avatarFile?: File | null;
    bannerFile?: File | null;
    avatarUrl?: string;
    bannerUrl?: string;
  }) => {
    setIsPending(true);
    try {
      let avatarUrl = variables.avatarUrl;
      let bannerUrl = variables.bannerUrl;

      if (variables.avatarFile) {
        const uploaded = await uploadFile("avatar", variables.avatarFile);
        avatarUrl = uploaded.url;
      }
      if (variables.bannerFile) {
        const uploaded = await uploadFile("banner", variables.bannerFile);
        bannerUrl = uploaded.url;
      }

      return await updateMutation({
        communityId: variables.communityId as Id<"communities">,
        name: variables.name,
        description: variables.description,
        themeColor: variables.themeColor,
        tags: variables.tags,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: Parameters<typeof run>[0], options?: MutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useJoinCommunity = () => {
  const joinMutation = useMutation(api.communities.join);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string) => {
    setIsPending(true);
    try {
      return await joinMutation({ communityId: communityId as Id<"communities"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (communityId: string, options?: MutationOptions) => {
      run(communityId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useLeaveCommunity = () => {
  const leaveMutation = useMutation(api.communities.leave);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string) => {
    setIsPending(true);
    try {
      return await leaveMutation({ communityId: communityId as Id<"communities"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (communityId: string, options?: MutationOptions) => {
      run(communityId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const usePromoteMod = () => {
  const promoteMutation = useMutation(api.communities.promoteMod);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await promoteMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (args: { communityId: string; profileId: string }, options?: MutationOptions) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
    isPending,
  };
};

export const useDemoteMod = () => {
  const demoteMutation = useMutation(api.communities.demoteMod);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await demoteMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (args: { communityId: string; profileId: string }, options?: MutationOptions) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
    isPending,
  };
};

export const useRemoveMember = () => {
  const removeMutation = useMutation(api.communities.removeMember);
  const [isPending, setIsPending] = useState(false);

  const run = async (communityId: string, profileId: string) => {
    setIsPending(true);
    try {
      return await removeMutation({
        communityId: communityId as Id<"communities">,
        profileId: profileId as Id<"profiles">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (args: { communityId: string; profileId: string }, options?: MutationOptions) => {
      run(args.communityId, args.profileId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: (args: { communityId: string; profileId: string }) =>
      run(args.communityId, args.profileId),
    isPending,
  };
};
