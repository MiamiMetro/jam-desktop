// FriendsTab.tsx — Friends page with view stack (friends list, DM, search, requests)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, UserCheck, Users } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useFriendRequests } from "@/hooks/useFriends";
import FriendsList from "@/components/social/FriendsList";
import DMConversation from "@/components/social/DMConversation";
import UserSearchPanel from "@/components/social/UserSearchPanel";
import FriendRequestsPanel from "@/components/social/FriendRequestsPanel";

type FriendsView = "friends" | "dm" | "search" | "requests";

function FriendsTab() {
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { openLogin } = useAuthModalStore();
  const { data: friendRequests = [] } = useFriendRequests();
  const [view, setView] = useState<FriendsView>("friends");
  const [dmPartnerId, setDmPartnerId] = useState<string | null>(null);

  const handleSelectFriend = (friendId: string) => {
    setDmPartnerId(friendId);
    setView("dm");
  };

  if (isGuest) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-heading font-bold mb-2">Friends</h2>
        <p className="text-sm text-muted-foreground mb-4">Sign in to connect with friends and start messaging</p>
        <Button variant="default" className="glow-primary" onClick={openLogin}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold mb-1">Friends</h2>
          <p className="text-sm text-muted-foreground">Chat with friends and find new people</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "search" ? "default" : "outline"}
            size="sm"
            onClick={() => setView(view === "search" ? "friends" : "search")}
            title="Search users"
          >
            <Search className="h-4 w-4 mr-2" />
            Find People
          </Button>
          <Button
            variant={view === "requests" ? "default" : "outline"}
            size="sm"
            onClick={() => { setView(view === "requests" ? "friends" : "requests"); setDmPartnerId(null); }}
            title="Friend requests"
            className="relative"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Requests
            {friendRequests.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full min-w-4 text-center">
                {friendRequests.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* View stack */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {view === "search" && (
          <UserSearchPanel onClose={() => setView("friends")} />
        )}
        {view === "dm" && dmPartnerId && (
          <DMConversation partnerId={dmPartnerId} onBack={() => { setDmPartnerId(null); setView("friends"); }} />
        )}
        {view === "requests" && (
          <FriendRequestsPanel onBack={() => setView("friends")} />
        )}
        {view === "friends" && (
          <FriendsList onSelectFriend={handleSelectFriend} />
        )}
      </div>
    </div>
  );
}

export default FriendsTab;
