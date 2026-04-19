import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

// Band listing type inferred from Convex backend
type ListingQueryReturn = FunctionReturnType<typeof api.bands.getMyListingsPaginated>;
export type BandListing = ListingQueryReturn["page"][number];

type ApplicationQueryReturn = FunctionReturnType<typeof api.bands.getMyApplicationsPaginated>;
export type BandApplication = ApplicationQueryReturn["page"][number];

type MyBandsReturn = FunctionReturnType<typeof api.bands.getMyBandsPaginated>;
export type MyBand = MyBandsReturn["page"][number];

type UserBandListingsReturn = FunctionReturnType<typeof api.bands.getByUserPaginated>;
export type UserBandListing = UserBandListingsReturn["page"][number];

type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

// ============================================
// Queries
// ============================================

export const useBandListings = (filters?: {
  seekingRole?: string;
  region?: string;
  search?: string;
}) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.listPaginated,
    {
      seekingRole: filters?.seekingRole,
      region: filters?.region,
      search: filters?.search,
    },
    { initialNumItems: 20 }
  );

  return {
    data: results as BandListing[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useMyBandListings = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getMyListingsPaginated,
    {},
    { initialNumItems: 20 }
  );

  return {
    data: results as BandListing[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useActiveListingCount = () => {
  const result = useQuery(api.bands.getActiveListingCount, {});
  return result ?? 0;
};

export const useBandApplications = (listingId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getApplications,
    listingId
      ? { listingId: listingId as Id<"band_listings"> }
      : "skip",
    { initialNumItems: 20 }
  );

  return {
    data: results as BandApplication[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useMyBandApplications = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getMyApplicationsPaginated,
    {},
    { initialNumItems: 20 }
  );

  return {
    data: results as BandApplication[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useMyBands = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getMyBandsPaginated,
    {},
    { initialNumItems: 20 }
  );

  return {
    data: results as MyBand[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

export const useUserBandListings = (userId: string | undefined) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bands.getByUserPaginated,
    userId ? { userId: userId as Id<"profiles"> } : "skip",
    { initialNumItems: 10 }
  );

  return {
    data: results as BandListing[],
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(20),
  };
};

// ============================================
// Mutations
// ============================================

export const useCreateBandListing = () => {
  const createMutation = useMutation(api.bands.createListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    bandName: string;
    currentMembers: number;
    maxMembers: number;
    seekingRole: string;
    region: string;
    description?: string;
    genre?: string;
  }) => {
    setIsPending(true);
    try {
      return await createMutation(variables);
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

export const useCloseBandListing = () => {
  const closeMutation = useMutation(api.bands.closeListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (listingId: string) => {
    setIsPending(true);
    try {
      return await closeMutation({
        listingId: listingId as Id<"band_listings">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (listingId: string, options?: MutationOptions) => {
      run(listingId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeleteBandListing = () => {
  const deleteMutation = useMutation(api.bands.deleteListing);
  const [isPending, setIsPending] = useState(false);

  const run = async (listingId: string) => {
    setIsPending(true);
    try {
      return await deleteMutation({
        listingId: listingId as Id<"band_listings">,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (listingId: string, options?: MutationOptions) => {
      run(listingId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useApplyToBand = () => {
  const applyMutation = useMutation(api.bands.apply);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    listingId: string;
    instrument: string;
    experience: string;
    message?: string;
  }) => {
    setIsPending(true);
    try {
      return await applyMutation({
        listingId: variables.listingId as Id<"band_listings">,
        instrument: variables.instrument,
        experience: variables.experience,
        message: variables.message,
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

export const useRespondToBandApplication = () => {
  const respondMutation = useMutation(api.bands.respondToApplication);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: {
    applicationId: string;
    response: "accepted" | "rejected";
  }) => {
    setIsPending(true);
    try {
      return await respondMutation({
        applicationId: variables.applicationId as Id<"band_applications">,
        response: variables.response,
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
