"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Brain, RotateCcw, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

// --- Types ---

interface Flashcard {
  id: string;
  front: string;
  back: string;
  easeFactor: number; // SM-2 inspired
  interval: number; // days until next review
  nextReview: string; // ISO date string "YYYY-MM-DD"
  lastRating: "easy" | "good" | "hard" | null;
}

interface FlashcardDeck {
  id: string;
  articleTitle: string;
  articleSummary: string;
  cards: Flashcard[];
  createdAt: string;
}

interface ReviewSession {
  cardsReviewed: number;
  date: string; // "YYYY-MM-DD"
}

interface FlashcardStore {
  decks: FlashcardDeck[];
  reviewHistory: ReviewSession[];
  streakDays: number;
  lastReviewDate: string;
}

// --- Helpers ---

const STORAGE_KEY = "feedbot-flashcards";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function loadStore(): FlashcardStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { decks: [], reviewHistory: [], streakDays: 0, lastReviewDate: "" };
}

function saveStore(store: FlashcardStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function getNextReviewDate(rating: "easy" | "good" | "hard"): string {
  const now = new Date();
  switch (rating) {
    case "easy":
      now.setDate(now.getDate() + 3);
      break;
    case "good":
      now.setDate(now.getDate() + 1);
      break;
    case "hard":
      // same day — already today
      break;
  }
  return now.toISOString().split("T")[0];
}

function isDue(card: Flashcard): boolean {
  return card.nextReview <= getToday();
}

function getDueCount(decks: FlashcardDeck[]): number {
  let count = 0;
  for (const deck of decks) {
    for (const card of deck.cards) {
      if (isDue(card)) count++;
    }
  }
  return count;
}

function getMasteryPercent(deck: FlashcardDeck): number {
  if (deck.cards.length === 0) return 0;
  const easyCount = deck.cards.filter((c) => c.lastRating === "easy").length;
  return Math.round((easyCount / deck.cards.length) * 100);
}

function getNextReviewForDeck(deck: FlashcardDeck): string | null {
  if (deck.cards.length === 0) return null;
  const dates = deck.cards.map((c) => c.nextReview).sort();
  return dates[0];
}

// --- Flashcard Generation ---

function generateFlashcards(title: string, summary: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const today = getToday();

  // Split summary into sentences
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  // Extract key entities from title
  const titleWords = title.replace(/[^\w\s]/g, "").split(/\s+/);
  const significantWords = titleWords.filter((w) => w.length > 3 && w[0] === w[0].toUpperCase());
  const subject = significantWords.length > 0 ? significantWords.join(" ") : title.split(/[:—\-|]/)[0].trim();

  // Card 1: Main topic from title
  cards.push({
    id: generateId(),
    front: `What is the main topic of "${title.length > 60 ? title.slice(0, 57) + "..." : title}"?`,
    back: sentences[0] || summary.slice(0, 150),
    easeFactor: 2.5,
    interval: 0,
    nextReview: today,
    lastRating: null,
  });

  // Card 2: Key detail from an early sentence
  if (sentences.length >= 2) {
    cards.push({
      id: generateId(),
      front: `What did ${subject} announce or achieve?`,
      back: sentences[1],
      easeFactor: 2.5,
      interval: 0,
      nextReview: today,
      lastRating: null,
    });
  }

  // Card 3: Number/stat extraction
  const statSentence = sentences.find((s) => /\d+/.test(s) && s.length > 25);
  if (statSentence) {
    cards.push({
      id: generateId(),
      front: `What key figure or statistic is mentioned regarding ${subject}?`,
      back: statSentence,
      easeFactor: 2.5,
      interval: 0,
      nextReview: today,
      lastRating: null,
    });
  }

  // Card 4: Why it matters / impact
  const impactSentence = sentences.find(
    (s) =>
      /impact|important|significant|means|result|implication|because|lead|could|will/i.test(s) &&
      !cards.some((c) => c.back === s)
  );
  if (impactSentence) {
    cards.push({
      id: generateId(),
      front: `Why is this development about ${subject} significant?`,
      back: impactSentence,
      easeFactor: 2.5,
      interval: 0,
      nextReview: today,
      lastRating: null,
    });
  }

  // Card 5: Fill from remaining sentences if we have fewer than 3
  if (cards.length < 3 && sentences.length > 2) {
    const unused = sentences.find((s) => !cards.some((c) => c.back === s));
    if (unused) {
      cards.push({
        id: generateId(),
        front: `What additional detail is reported about ${subject}?`,
        back: unused,
        easeFactor: 2.5,
        interval: 0,
        nextReview: today,
        lastRating: null,
      });
    }
  }

  return cards.slice(0, 5);
}

// --- Streak calculation ---

function computeStreak(history: ReviewSession[], lastDate: string): number {
  if (!lastDate) return 0;
  const today = getToday();
  // If last review isn't today or yesterday, streak is broken
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate !== today && lastDate !== yesterdayStr) return 0;

  let streak = 0;
  const dateSet = new Set(history.map((h) => h.date));
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split("T")[0];
    if (dateSet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// --- Components ---

function CardFlip({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      className="perspective-[800px] mx-auto h-52 w-full max-w-md cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-bg-card p-5 text-center [backface-visibility:hidden]">
          <Brain className="mb-3 h-5 w-5 text-primary/50" />
          <p className="text-sm leading-relaxed text-text">{card.front}</p>
          <p className="mt-3 text-[10px] text-text-muted">Tap to reveal</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-primary/30 bg-bg-card p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-sm leading-relaxed text-text">{card.back}</p>
        </div>
      </div>
    </div>
  );
}

function RatingButtons({ onRate }: { onRate: (rating: "easy" | "good" | "hard") => void }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => onRate("hard")}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
      >
        Hard
      </button>
      <button
        onClick={() => onRate("good")}
        className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
      >
        Good
      </button>
      <button
        onClick={() => onRate("easy")}
        className="rounded-lg border border-green-500/30 bg-green-500/10 px-3.5 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
      >
        Easy
      </button>
    </div>
  );
}

function ReviewSession({
  dueCards,
  onRate,
  onClose,
}: {
  dueCards: { deckId: string; card: Flashcard }[];
  onRate: (deckId: string, cardId: string, rating: "easy" | "good" | "hard") => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Brain className="h-8 w-8 text-green-400" />
        <p className="text-sm font-medium text-text">All caught up!</p>
        <p className="text-xs text-text-muted">No cards due for review right now.</p>
        <button
          onClick={onClose}
          className="mt-2 rounded-lg bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Done
        </button>
      </div>
    );
  }

  const current = dueCards[index];
  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Brain className="h-8 w-8 text-green-400" />
        <p className="text-sm font-medium text-text">Session complete!</p>
        <p className="text-xs text-text-muted">
          You reviewed {dueCards.length} card{dueCards.length !== 1 ? "s" : ""}.
        </p>
        <button
          onClick={onClose}
          className="mt-2 rounded-lg bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Done
        </button>
      </div>
    );
  }

  const handleRate = (rating: "easy" | "good" | "hard") => {
    onRate(current.deckId, current.card.id, rating);
    setFlipped(false);
    setIndex((prev) => prev + 1);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Card {index + 1} of {dueCards.length}
        </p>
        <button
          onClick={onClose}
          className="text-xs text-text-muted transition-colors hover:text-text"
        >
          End session
        </button>
      </div>
      {/* Progress bar */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((index) / dueCards.length) * 100}%` }}
        />
      </div>
      <CardFlip card={current.card} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
      {flipped && <RatingButtons onRate={handleRate} />}
      {!flipped && (
        <p className="mt-3 text-center text-[10px] text-text-muted">Click the card to see the answer</p>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  onOpen,
  onDelete,
}: {
  deck: FlashcardDeck;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const mastery = getMasteryPercent(deck);
  const dueCount = deck.cards.filter(isDue).length;
  const nextReview = getNextReviewForDeck(deck);

  return (
    <div className="group relative rounded-xl border border-border bg-bg-card p-3 transition-colors hover:border-primary/30">
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 rounded-md p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
        title="Delete deck"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onOpen} className="w-full text-left">
        <h4 className="line-clamp-2 pr-6 text-xs font-semibold text-text">
          {deck.articleTitle}
        </h4>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
          <span>{deck.cards.length} cards</span>
          <span>{mastery}% mastery</span>
        </div>
        {dueCount > 0 && (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {dueCount} due
          </span>
        )}
        {nextReview && dueCount === 0 && (
          <p className="mt-1.5 text-[10px] text-text-muted">
            Next review: {nextReview}
          </p>
        )}
      </button>
    </div>
  );
}

function DeckViewer({
  deck,
  onRate,
  onBack,
}: {
  deck: FlashcardDeck;
  onRate: (cardId: string, rating: "easy" | "good" | "hard") => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck.cards[index];
  if (!card) return null;

  const handleRate = (rating: "easy" | "good" | "hard") => {
    onRate(card.id, rating);
    setFlipped(false);
    if (index < deck.cards.length - 1) {
      setIndex((prev) => prev + 1);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to decks
        </button>
        <p className="text-xs text-text-muted">
          {index + 1} / {deck.cards.length}
        </p>
      </div>
      <h4 className="mb-3 line-clamp-1 text-xs font-semibold text-text">{deck.articleTitle}</h4>
      <CardFlip card={card} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
      {flipped && <RatingButtons onRate={handleRate} />}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((prev) => Math.max(0, prev - 1));
          }}
          disabled={index === 0}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((prev) => Math.min(deck.cards.length - 1, prev + 1));
          }}
          disabled={index === deck.cards.length - 1}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

export function ArticleFlashcards() {
  const [store, setStore] = useState<FlashcardStore>({
    decks: [],
    reviewHistory: [],
    streakDays: 0,
    lastReviewDate: "",
  });
  const [view, setView] = useState<"decks" | "review" | "deck-detail">("decks");
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setStore(loadStore());
  }, []);

  const persist = useCallback((next: FlashcardStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  const totalDue = useMemo(() => getDueCount(store.decks), [store.decks]);

  const todayReviewed = useMemo(() => {
    const today = getToday();
    const session = store.reviewHistory.find((h) => h.date === today);
    return session?.cardsReviewed || 0;
  }, [store.reviewHistory]);

  const totalCards = useMemo(
    () => store.decks.reduce((sum, d) => sum + d.cards.length, 0),
    [store.decks]
  );

  const overallMastery = useMemo(() => {
    if (totalCards === 0) return 0;
    const easyCount = store.decks.reduce(
      (sum, d) => sum + d.cards.filter((c) => c.lastRating === "easy").length,
      0
    );
    return Math.round((easyCount / totalCards) * 100);
  }, [store.decks, totalCards]);

  const streak = useMemo(
    () => computeStreak(store.reviewHistory, store.lastReviewDate),
    [store.reviewHistory, store.lastReviewDate]
  );

  const dueCards = useMemo(() => {
    const result: { deckId: string; card: Flashcard }[] = [];
    for (const deck of store.decks) {
      for (const card of deck.cards) {
        if (isDue(card)) result.push({ deckId: deck.id, card });
      }
    }
    return result;
  }, [store.decks]);

  const handleRate = useCallback(
    (deckId: string, cardId: string, rating: "easy" | "good" | "hard") => {
      const today = getToday();
      const next = { ...store };
      next.decks = next.decks.map((d) => {
        if (d.id !== deckId) return d;
        return {
          ...d,
          cards: d.cards.map((c) => {
            if (c.id !== cardId) return c;
            return {
              ...c,
              lastRating: rating,
              nextReview: getNextReviewDate(rating),
              interval: rating === "easy" ? 3 : rating === "good" ? 1 : 0,
            };
          }),
        };
      });

      // Update review history
      const existingSession = next.reviewHistory.find((h) => h.date === today);
      if (existingSession) {
        existingSession.cardsReviewed++;
      } else {
        next.reviewHistory = [...next.reviewHistory, { date: today, cardsReviewed: 1 }];
      }
      next.lastReviewDate = today;
      next.streakDays = computeStreak(next.reviewHistory, today);

      persist(next);
    },
    [store, persist]
  );

  const handleDeleteDeck = useCallback(
    (deckId: string) => {
      const next = { ...store, decks: store.decks.filter((d) => d.id !== deckId) };
      persist(next);
    },
    [store, persist]
  );

  const activeDeck = store.decks.find((d) => d.id === activeDeckId);

  if (!expanded) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-text">Flashcards</h3>
            <p className="text-[10px] text-text-muted">
              {store.decks.length} deck{store.decks.length !== 1 ? "s" : ""} &middot; {totalCards} cards
              {totalDue > 0 && (
                <span className="ml-1 text-primary">&middot; {totalDue} due</span>
              )}
            </p>
          </div>
          {totalDue > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {totalDue}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Flashcards</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {totalDue > 0 && view !== "review" && (
            <button
              onClick={() => setView("review")}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <RotateCcw className="h-3 w-3" />
              Review {totalDue} due
            </button>
          )}
          <button
            onClick={() => setExpanded(false)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-3 flex items-center gap-4 rounded-lg bg-bg p-2.5 text-[10px] text-text-muted">
        <span>{totalCards} cards</span>
        <span>{todayReviewed} reviewed today</span>
        <span>{overallMastery}% mastery</span>
        {streak > 0 && <span>{streak} day streak</span>}
      </div>

      {/* Views */}
      {view === "review" && (
        <ReviewSession
          dueCards={dueCards}
          onRate={handleRate}
          onClose={() => setView("decks")}
        />
      )}

      {view === "deck-detail" && activeDeck && (
        <DeckViewer
          deck={activeDeck}
          onRate={(cardId, rating) => handleRate(activeDeck.id, cardId, rating)}
          onBack={() => {
            setActiveDeckId(null);
            setView("decks");
          }}
        />
      )}

      {view === "decks" && (
        <>
          {store.decks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Brain className="h-6 w-6 text-text-muted/50" />
              <p className="text-xs text-text-muted">No flashcard decks yet.</p>
              <p className="text-[10px] text-text-muted">
                Click the flashcard button on any article to create a deck.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {store.decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onOpen={() => {
                    setActiveDeckId(deck.id);
                    setView("deck-detail");
                  }}
                  onDelete={() => handleDeleteDeck(deck.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Standalone Exports ---

export function CreateFlashcardsButton({
  articleTitle,
  articleSummary,
}: {
  articleTitle: string;
  articleSummary: string;
}) {
  const [created, setCreated] = useState(false);

  const handleCreate = useCallback(() => {
    const store = loadStore();
    // Check if deck already exists for this article
    if (store.decks.some((d) => d.articleTitle === articleTitle)) {
      setCreated(true);
      return;
    }

    const cards = generateFlashcards(articleTitle, articleSummary);
    const deck: FlashcardDeck = {
      id: generateId(),
      articleTitle,
      articleSummary,
      cards,
      createdAt: new Date().toISOString(),
    };
    store.decks.push(deck);
    saveStore(store);
    setCreated(true);
  }, [articleTitle, articleSummary]);

  if (created) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-green-400">
        <Brain className="h-3 w-3" />
        Deck created
      </span>
    );
  }

  return (
    <button
      onClick={handleCreate}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
      title="Create flashcards from this article"
    >
      <Plus className="h-3 w-3" />
      Flashcards
    </button>
  );
}

export function FlashcardsDueBadge() {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const store = loadStore();
    setDueCount(getDueCount(store.decks));
  }, []);

  if (dueCount === 0) return null;

  return (
    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
      {dueCount}
    </span>
  );
}
