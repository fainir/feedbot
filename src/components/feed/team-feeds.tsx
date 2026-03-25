"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Crown,
  ThumbsUp,
  ThumbsDown,
  Activity,
  X,
  Plus,
  Link,
  Mail,
  Copy,
  Check,
  Bookmark,
  TrendingUp,
  Eye,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
} from "lucide-react";

// --- Types ---

type Role = "owner" | "editor" | "viewer";
type Visibility = "public" | "private";
type Vote = "up" | "down" | null;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
}

interface ActivityEntry {
  id: string;
  memberId: string;
  memberName: string;
  action: string;
  timestamp: string;
}

interface SuggestedArticle {
  id: string;
  title: string;
  url: string;
  suggestedBy: string;
  votes: Record<string, Vote>;
  addedAt: string;
}

interface SharedBookmark {
  id: string;
  title: string;
  url: string;
  savedBy: string;
  savedAt: string;
}

interface TeamFeed {
  id: string;
  name: string;
  description: string;
  visibility: Visibility;
  members: TeamMember[];
  activity: ActivityEntry[];
  suggestions: SuggestedArticle[];
  bookmarks: SharedBookmark[];
  createdAt: string;
}

interface TeamFeedsData {
  feeds: TeamFeed[];
  currentUserId: string;
}

// --- Constants ---

const STORAGE_KEY = "feedbot-team-feeds";

const MEMBER_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-teal-500",
];

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

// --- Mock Data ---

function createMockData(): TeamFeedsData {
  const currentUserId = "user-me";
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

  const members: TeamMember[] = [
    { id: currentUserId, name: "You", email: "you@example.com", role: "owner", color: MEMBER_COLORS[0] },
    { id: "user-alice", name: "Alice Chen", email: "alice@example.com", role: "editor", color: MEMBER_COLORS[1] },
    { id: "user-bob", name: "Bob Martinez", email: "bob@example.com", role: "editor", color: MEMBER_COLORS[2] },
    { id: "user-carol", name: "Carol Kim", email: "carol@example.com", role: "viewer", color: MEMBER_COLORS[3] },
  ];

  const activity: ActivityEntry[] = [
    { id: "act-1", memberId: "user-alice", memberName: "Alice Chen", action: "added 3 articles", timestamp: ago(12) },
    { id: "act-2", memberId: "user-bob", memberName: "Bob Martinez", action: "bookmarked an article", timestamp: ago(45) },
    { id: "act-3", memberId: "user-carol", memberName: "Carol Kim", action: "suggested a new source", timestamp: ago(90) },
    { id: "act-4", memberId: currentUserId, memberName: "You", action: "upvoted 2 suggestions", timestamp: ago(120) },
    { id: "act-5", memberId: "user-alice", memberName: "Alice Chen", action: "updated feed description", timestamp: ago(200) },
  ];

  const suggestions: SuggestedArticle[] = [
    {
      id: "sug-1",
      title: "The Future of AI-Powered RSS Readers",
      url: "https://example.com/ai-rss",
      suggestedBy: "Alice Chen",
      votes: { [currentUserId]: "up", "user-bob": "up" },
      addedAt: ago(30),
    },
    {
      id: "sug-2",
      title: "Building Real-Time Collaboration Features",
      url: "https://example.com/collab",
      suggestedBy: "Bob Martinez",
      votes: { "user-alice": "up", "user-carol": "down" },
      addedAt: ago(60),
    },
    {
      id: "sug-3",
      title: "10 Best Practices for Content Curation",
      url: "https://example.com/curation",
      suggestedBy: "Carol Kim",
      votes: {},
      addedAt: ago(150),
    },
  ];

  const bookmarks: SharedBookmark[] = [
    { id: "bm-1", title: "Next.js 15 Migration Guide", url: "https://example.com/nextjs15", savedBy: "Alice Chen", savedAt: ago(100) },
    { id: "bm-2", title: "Supabase Realtime Deep Dive", url: "https://example.com/supabase-rt", savedBy: "Bob Martinez", savedAt: ago(250) },
  ];

  return {
    currentUserId,
    feeds: [
      {
        id: "team-1",
        name: "Engineering Reads",
        description: "Shared technical articles and engineering blog posts for the team",
        visibility: "private",
        members,
        activity,
        suggestions,
        bookmarks,
        createdAt: ago(10000),
      },
    ],
  };
}

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function generateInviteLink(feedId: string, feedName: string): string {
  const payload = btoa(JSON.stringify({ feedId, feedName, ts: Date.now() }));
  return `${typeof window !== "undefined" ? window.location.origin : ""}/join?invite=${payload}`;
}

function voteCount(votes: Record<string, Vote>): { up: number; down: number } {
  let up = 0;
  let down = 0;
  for (const v of Object.values(votes)) {
    if (v === "up") up++;
    if (v === "down") down++;
  }
  return { up, down };
}

// --- Avatar Component ---

function Avatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const sizeClasses = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  return (
    <div
      className={`${sizeClasses} ${color} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

// --- Sub-panels ---

function MembersSection({
  members,
  currentUserId,
  onInvite,
}: {
  members: TeamMember[];
  currentUserId: string;
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState("");

  const handleInvite = () => {
    if (email.trim() && email.includes("@")) {
      onInvite(email.trim());
      setEmail("");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
        Members ({members.length})
      </p>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-lg bg-bg p-2">
            <Avatar name={m.name} color={m.color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text">
                {m.name}
                {m.id === currentUserId && (
                  <span className="ml-1.5 text-[10px] text-text-muted">(you)</span>
                )}
              </p>
              <p className="truncate text-[10px] text-text-muted">{m.email}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-muted">
                {ROLE_LABELS[m.role]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="email"
            placeholder="Invite by email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="w-full rounded-lg border border-border bg-bg py-1.5 pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={handleInvite}
          disabled={!email.trim() || !email.includes("@")}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite
        </button>
      </div>
    </div>
  );
}

function InviteLinkSection({ feedId, feedName }: { feedId: string; feedName: string }) {
  const [copied, setCopied] = useState(false);
  const link = generateInviteLink(feedId, feedName);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [link]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Invite Link</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-lg border border-border bg-bg px-3 py-1.5 text-[11px] text-text-muted">
          {link}
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ActivitySection({ activity, members }: { activity: ActivityEntry[]; members: TeamMember[] }) {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Recent Activity
        </p>
      </div>
      <div className="space-y-2">
        {activity.slice(0, 8).map((entry) => {
          const member = memberMap.get(entry.memberId);
          return (
            <div key={entry.id} className="flex items-start gap-2.5 rounded-lg bg-bg p-2">
              <Avatar
                name={entry.memberName}
                color={member?.color || MEMBER_COLORS[0]}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text">
                  <span className="font-medium">{entry.memberName}</span>{" "}
                  <span className="text-text-muted">{entry.action}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {formatRelativeTime(entry.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  currentUserId,
  onVote,
  onAdd,
}: {
  suggestions: SuggestedArticle[];
  currentUserId: string;
  onVote: (suggestionId: string, vote: Vote) => void;
  onAdd: (title: string, url: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (title.trim() && url.trim()) {
      onAdd(title.trim(), url.trim());
      setTitle("");
      setUrl("");
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Article Suggestions ({suggestions.length})
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-3 w-3" />
          Suggest
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
          <input
            placeholder="Article title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-2.5 py-1 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !url.trim()}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s) => {
          const { up, down } = voteCount(s.votes);
          const myVote = s.votes[currentUserId] || null;
          return (
            <div key={s.id} className="rounded-lg border border-border bg-bg p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <button
                    onClick={() => onVote(s.id, myVote === "up" ? null : "up")}
                    className={`rounded p-0.5 transition-colors ${
                      myVote === "up"
                        ? "text-emerald-500"
                        : "text-text-muted hover:text-emerald-500"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-medium text-text-muted">{up - down}</span>
                  <button
                    onClick={() => onVote(s.id, myVote === "down" ? null : "down")}
                    className={`rounded p-0.5 transition-colors ${
                      myVote === "down"
                        ? "text-rose-500"
                        : "text-text-muted hover:text-rose-500"
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-text transition-colors hover:text-primary"
                  >
                    {s.title}
                  </a>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    Suggested by {s.suggestedBy} · {formatRelativeTime(s.addedAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookmarksSection({ bookmarks }: { bookmarks: SharedBookmark[] }) {
  if (bookmarks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-text-muted" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Shared Bookmarks ({bookmarks.length})
        </p>
      </div>
      <div className="space-y-1.5">
        {bookmarks.map((bm) => (
          <div key={bm.id} className="flex items-center gap-2.5 rounded-lg bg-bg p-2">
            <Bookmark className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <div className="min-w-0 flex-1">
              <a
                href={bm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs text-text transition-colors hover:text-primary"
              >
                {bm.title}
              </a>
              <p className="text-[10px] text-text-muted">
                {bm.savedBy} · {formatRelativeTime(bm.savedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamStatsBar({ feed }: { feed: TeamFeed }) {
  const totalArticles = feed.suggestions.length + feed.bookmarks.length;
  const activeMembers = feed.members.length;

  // Find most active curator based on activity entries
  const activityCounts: Record<string, number> = {};
  for (const a of feed.activity) {
    activityCounts[a.memberName] = (activityCounts[a.memberName] || 0) + 1;
  }
  const mostActive = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-3 gap-0 divide-x divide-border rounded-lg border border-border bg-bg">
      <div className="p-2.5 text-center">
        <p className="text-sm font-bold text-text">{totalArticles}</p>
        <p className="text-[10px] text-text-muted">Articles</p>
      </div>
      <div className="p-2.5 text-center">
        <p className="text-sm font-bold text-text">{activeMembers}</p>
        <p className="text-[10px] text-text-muted">Members</p>
      </div>
      <div className="p-2.5 text-center">
        <p className="truncate text-sm font-bold text-primary">{mostActive?.[0] || "—"}</p>
        <p className="text-[10px] text-text-muted">Top Curator</p>
      </div>
    </div>
  );
}

// --- Create Feed Form ---

function CreateFeedForm({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string, vis: Visibility) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), visibility);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">Create Team Feed</h4>
        <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:text-text">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        placeholder="Feed name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted">Visibility:</p>
        <button
          onClick={() => setVisibility("public")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            visibility === "public"
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:text-text"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Public
        </button>
        <button
          onClick={() => setVisibility("private")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            visibility === "private"
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:text-text"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Private
        </button>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40"
        >
          Create
        </button>
      </div>
    </div>
  );
}

// --- Main Panel ---

export function TeamFeedsPanel() {
  const [data, setData] = useState<TeamFeedsData | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "activity" | "curation" | "bookmarks">("members");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        const mock = createMockData();
        setData(mock);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
      }
    } catch {
      const mock = createMockData();
      setData(mock);
    }
  }, []);

  // Persist
  const persist = useCallback((updated: TeamFeedsData) => {
    setData(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const handleCreateFeed = (name: string, description: string, visibility: Visibility) => {
    if (!data) return;
    const newFeed: TeamFeed = {
      id: `team-${Date.now()}`,
      name,
      description,
      visibility,
      members: [
        {
          id: data.currentUserId,
          name: "You",
          email: "you@example.com",
          role: "owner",
          color: MEMBER_COLORS[0],
        },
      ],
      activity: [
        {
          id: `act-${Date.now()}`,
          memberId: data.currentUserId,
          memberName: "You",
          action: "created this feed",
          timestamp: new Date().toISOString(),
        },
      ],
      suggestions: [],
      bookmarks: [],
      createdAt: new Date().toISOString(),
    };
    const updated = { ...data, feeds: [...data.feeds, newFeed] };
    persist(updated);
    setActiveFeedId(newFeed.id);
    setShowCreate(false);
  };

  const handleInvite = (feedId: string, email: string) => {
    if (!data) return;
    const updated = {
      ...data,
      feeds: data.feeds.map((f) => {
        if (f.id !== feedId) return f;
        const newMember: TeamMember = {
          id: `user-${Date.now()}`,
          name: email.split("@")[0],
          email,
          role: "viewer",
          color: MEMBER_COLORS[f.members.length % MEMBER_COLORS.length],
        };
        const newActivity: ActivityEntry = {
          id: `act-${Date.now()}`,
          memberId: data.currentUserId,
          memberName: "You",
          action: `invited ${newMember.name}`,
          timestamp: new Date().toISOString(),
        };
        return {
          ...f,
          members: [...f.members, newMember],
          activity: [newActivity, ...f.activity],
        };
      }),
    };
    persist(updated);
  };

  const handleVote = (feedId: string, suggestionId: string, vote: Vote) => {
    if (!data) return;
    const updated = {
      ...data,
      feeds: data.feeds.map((f) => {
        if (f.id !== feedId) return f;
        return {
          ...f,
          suggestions: f.suggestions.map((s) => {
            if (s.id !== suggestionId) return s;
            const newVotes = { ...s.votes };
            if (vote === null) {
              delete newVotes[data.currentUserId];
            } else {
              newVotes[data.currentUserId] = vote;
            }
            return { ...s, votes: newVotes };
          }),
        };
      }),
    };
    persist(updated);
  };

  const handleAddSuggestion = (feedId: string, title: string, url: string) => {
    if (!data) return;
    const updated = {
      ...data,
      feeds: data.feeds.map((f) => {
        if (f.id !== feedId) return f;
        const newSuggestion: SuggestedArticle = {
          id: `sug-${Date.now()}`,
          title,
          url,
          suggestedBy: "You",
          votes: {},
          addedAt: new Date().toISOString(),
        };
        const newActivity: ActivityEntry = {
          id: `act-${Date.now()}`,
          memberId: data.currentUserId,
          memberName: "You",
          action: `suggested "${title}"`,
          timestamp: new Date().toISOString(),
        };
        return {
          ...f,
          suggestions: [newSuggestion, ...f.suggestions],
          activity: [newActivity, ...f.activity],
        };
      }),
    };
    persist(updated);
  };

  if (!data) return null;

  const activeFeed = data.feeds.find((f) => f.id === activeFeedId) || null;

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Team Feeds"
      >
        <Users className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Teams</span>
        {data.feeds.length > 0 && (
          <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
            {data.feeds.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Team Feeds</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {data.feeds.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            onClick={() => {
              setShowPanel(false);
              setActiveFeedId(null);
              setShowCreate(false);
            }}
            className="rounded-lg p-1 text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border-b border-border p-4">
          <CreateFeedForm
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateFeed}
          />
        </div>
      )}

      {/* Feed list */}
      {!activeFeed && (
        <div className="p-3">
          {data.feeds.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-muted">
              No team feeds yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {data.feeds.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => {
                    setActiveFeedId(feed.id);
                    setActiveTab("members");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-bg p-3 text-left transition-colors hover:bg-bg-hover"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-text">{feed.name}</p>
                      {feed.visibility === "private" ? (
                        <Lock className="h-3 w-3 shrink-0 text-text-muted" />
                      ) : (
                        <Globe className="h-3 w-3 shrink-0 text-text-muted" />
                      )}
                    </div>
                    <p className="truncate text-[10px] text-text-muted">
                      {feed.members.length} members · {feed.suggestions.length + feed.bookmarks.length} articles
                    </p>
                  </div>
                  <div className="flex -space-x-1.5">
                    {feed.members.slice(0, 3).map((m) => (
                      <Avatar key={m.id} name={m.name} color={m.color} size="sm" />
                    ))}
                    {feed.members.length > 3 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-hover text-[9px] font-medium text-text-muted ring-2 ring-bg-card">
                        +{feed.members.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active feed detail */}
      {activeFeed && (
        <div>
          {/* Feed header */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFeedId(null)}
                className="text-xs text-text-muted transition-colors hover:text-text"
              >
                ← Back
              </button>
              <span className="text-[10px] text-text-muted">/</span>
              <h4 className="truncate text-xs font-semibold text-text">{activeFeed.name}</h4>
            </div>
            {activeFeed.description && (
              <p className="mt-1 text-[10px] text-text-muted">{activeFeed.description}</p>
            )}
          </div>

          {/* Team stats */}
          <div className="border-b border-border p-3">
            <TeamStatsBar feed={activeFeed} />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(
              [
                { key: "members", label: "Members", icon: Users },
                { key: "activity", label: "Activity", icon: Activity },
                { key: "curation", label: "Curation", icon: ThumbsUp },
                { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-[11px] font-medium transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === "members" && (
              <div className="space-y-4">
                <MembersSection
                  members={activeFeed.members}
                  currentUserId={data.currentUserId}
                  onInvite={(email) => handleInvite(activeFeed.id, email)}
                />
                <InviteLinkSection feedId={activeFeed.id} feedName={activeFeed.name} />
              </div>
            )}
            {activeTab === "activity" && (
              <ActivitySection activity={activeFeed.activity} members={activeFeed.members} />
            )}
            {activeTab === "curation" && (
              <SuggestionsSection
                suggestions={activeFeed.suggestions}
                currentUserId={data.currentUserId}
                onVote={(sId, vote) => handleVote(activeFeed.id, sId, vote)}
                onAdd={(title, url) => handleAddSuggestion(activeFeed.id, title, url)}
              />
            )}
            {activeTab === "bookmarks" && (
              <BookmarksSection bookmarks={activeFeed.bookmarks} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Badge Component ---

export function TeamFeedsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: TeamFeedsData = JSON.parse(saved);
        setCount(parsed.feeds.length);
      } else {
        // Mock data would have 1 feed
        setCount(1);
      }
    } catch {
      setCount(0);
    }
  }, []);

  if (count === 0) return null;

  return (
    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
      {count}
    </span>
  );
}
