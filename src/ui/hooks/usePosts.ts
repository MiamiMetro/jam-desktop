import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPosts, fetchCommunityPosts, fetchGlobalPosts, fetchPost, fetchComments, createComment, type Post, type Comment } from '@/lib/api/mock';
import { useAuthStore } from '@/stores/authStore';

export const usePosts = () => {
  const { isGuest } = useAuthStore();
  
  return useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    select: (data) => {
      // Mix feed: 70-80% from communities, 20-30% global
      const communityPosts = data.filter(post => post.community && !post.isGlobal);
      const globalPosts = data.filter(post => post.isGlobal === true);
      
      // For guests, show more global content (50/50)
      // For logged in users, show 75% community, 25% global
      const communityRatio = isGuest ? 0.5 : 0.75;
      const globalRatio = isGuest ? 0.5 : 0.25;
      
      const communityCount = Math.floor(data.length * communityRatio);
      const globalCount = Math.floor(data.length * globalRatio);
      
      const mixedFeed = [
        ...communityPosts.slice(0, communityCount),
        ...globalPosts.slice(0, globalCount),
      ];
      
      // Fill remaining slots with community posts if available
      const remaining = data.length - mixedFeed.length;
      if (remaining > 0 && communityPosts.length > communityCount) {
        mixedFeed.push(...communityPosts.slice(communityCount, communityCount + remaining));
      }
      
      return mixedFeed;
    },
  });
};

export const useCommunityPosts = (communityId: string) => {
  return useQuery<Post[]>({
    queryKey: ['posts', 'community', communityId],
    queryFn: () => fetchCommunityPosts(communityId),
  });
};

export const useGlobalPosts = () => {
  return useQuery<Post[]>({
    queryKey: ['posts', 'global'],
    queryFn: fetchGlobalPosts,
  });
};

export const usePost = (postId: string) => {
  return useQuery<Post | null>({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    enabled: !!postId,
  });
};

export const useComments = (postId: string) => {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: ({ postId, content, audioFile }: { postId: string; content: string; audioFile?: File }) => {
      if (!user) throw new Error('User not authenticated');
      return createComment(postId, user.id, content, audioFile);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this post
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      // Invalidate the post to update comment count
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
};

