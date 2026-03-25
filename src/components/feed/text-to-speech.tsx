"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ListMusic,
  Mic,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

// --- Types ---

interface TTSArticle {
  id: string;
  title: string;
  summary: string;
}

interface TTSPrefs {
  voiceURI: string | null;
  speed: number;
  volume: number;
}

interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentArticleIndex: number;
  currentParagraphIndex: number;
  currentCharIndex: number;
  progress: number;
}

// --- Prefs helpers ---

const PREFS_KEY = "feedbot-tts-prefs";

function loadPrefs(): TTSPrefs {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { voiceURI: null, speed: 1, volume: 1 };
}

function savePrefs(prefs: TTSPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

// --- Speed options ---

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// --- Split article into paragraphs ---

function splitIntoParagraphs(article: TTSArticle): string[] {
  const parts: string[] = [];
  parts.push(article.title);
  const paragraphs = article.summary
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  parts.push(...paragraphs);
  return parts;
}

// --- Main TextToSpeech Component ---

interface TextToSpeechProps {
  article: TTSArticle;
  queue?: TTSArticle[];
  onQueueChange?: (queue: TTSArticle[]) => void;
  onHighlight?: (paragraphIndex: number, charIndex: number) => void;
  className?: string;
}

export function TextToSpeech({
  article,
  queue: externalQueue,
  onQueueChange,
  onHighlight,
  className = "",
}: TextToSpeechProps) {
  const [prefs, setPrefs] = useState<TTSPrefs>({ voiceURI: null, speed: 1, volume: 1 });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentArticleIndex: 0,
    currentParagraphIndex: 0,
    currentCharIndex: 0,
    progress: 0,
  });
  const [showQueue, setShowQueue] = useState(false);
  const [showVoices, setShowVoices] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const internalQueue = useRef<TTSArticle[]>([article]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const paragraphsRef = useRef<string[][]>([]);
  const ttsActiveRef = useRef(false);

  // Sync queue
  const queue = externalQueue || internalQueue.current;
  const setQueue = useCallback(
    (q: TTSArticle[]) => {
      internalQueue.current = q;
      onQueueChange?.(q);
    },
    [onQueueChange]
  );

  // Load prefs on mount
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Build paragraphs for every queued article
  useEffect(() => {
    paragraphsRef.current = queue.map((a) => splitIntoParagraphs(a));
  }, [queue]);

  // Ensure article is in queue
  useEffect(() => {
    if (!queue.find((a) => a.id === article.id)) {
      setQueue([article, ...queue]);
    }
  }, [article.id]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!ttsActiveRef.current) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skipForward();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skipBack();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Resolve the selected voice
  const selectedVoice = useMemo(() => {
    if (!prefs.voiceURI) return voices[0] || null;
    return voices.find((v) => v.voiceURI === prefs.voiceURI) || voices[0] || null;
  }, [prefs.voiceURI, voices]);

  // Update prefs and persist
  const updatePrefs = useCallback((partial: Partial<TTSPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  // Speak a paragraph
  const speakParagraph = useCallback(
    (articleIdx: number, paraIdx: number) => {
      const paragraphs = paragraphsRef.current[articleIdx];
      if (!paragraphs || paraIdx >= paragraphs.length) {
        // Move to next article
        const nextArticle = articleIdx + 1;
        if (nextArticle < queue.length) {
          // Brief pause between articles
          setTimeout(() => speakParagraph(nextArticle, 0), 800);
          setState((s) => ({
            ...s,
            currentArticleIndex: nextArticle,
            currentParagraphIndex: 0,
            currentCharIndex: 0,
          }));
        } else {
          // Done
          window.speechSynthesis.cancel();
          ttsActiveRef.current = false;
          setState((s) => ({
            ...s,
            isPlaying: false,
            isPaused: false,
            progress: 1,
          }));
          onHighlight?.(-1, -1);
        }
        return;
      }

      const text = paragraphs[paraIdx];
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = prefs.speed;
      utt.volume = prefs.volume;
      if (selectedVoice) utt.voice = selectedVoice;

      // Calculate total progress
      const totalParagraphs = paragraphsRef.current.reduce((sum, p) => sum + p.length, 0);
      let doneParagraphs = 0;
      for (let i = 0; i < articleIdx; i++) {
        doneParagraphs += paragraphsRef.current[i]?.length || 0;
      }
      doneParagraphs += paraIdx;

      utt.onboundary = (e) => {
        if (e.name === "word" || e.name === "sentence") {
          setState((s) => ({
            ...s,
            currentCharIndex: e.charIndex,
          }));
          onHighlight?.(paraIdx, e.charIndex);
        }
      };

      utt.onend = () => {
        speakParagraph(articleIdx, paraIdx + 1);
      };

      utt.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") return;
        // Try next paragraph on error
        speakParagraph(articleIdx, paraIdx + 1);
      };

      utteranceRef.current = utt;
      setState((s) => ({
        ...s,
        isPlaying: true,
        isPaused: false,
        currentArticleIndex: articleIdx,
        currentParagraphIndex: paraIdx,
        currentCharIndex: 0,
        progress: totalParagraphs > 0 ? doneParagraphs / totalParagraphs : 0,
      }));
      onHighlight?.(paraIdx, 0);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    },
    [prefs.speed, prefs.volume, selectedVoice, queue.length, onHighlight]
  );

  // Play
  const play = useCallback(() => {
    ttsActiveRef.current = true;
    if (state.isPaused) {
      window.speechSynthesis.resume();
      setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
    } else {
      speakParagraph(state.currentArticleIndex, state.currentParagraphIndex);
    }
  }, [state.isPaused, state.currentArticleIndex, state.currentParagraphIndex, speakParagraph]);

  // Pause
  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setState((s) => ({ ...s, isPlaying: false, isPaused: true }));
  }, []);

  // Toggle
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

  // Stop
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    ttsActiveRef.current = false;
    setState({
      isPlaying: false,
      isPaused: false,
      currentArticleIndex: 0,
      currentParagraphIndex: 0,
      currentCharIndex: 0,
      progress: 0,
    });
    onHighlight?.(-1, -1);
  }, [onHighlight]);

  // Skip forward (next paragraph)
  const skipForward = useCallback(() => {
    const { currentArticleIndex, currentParagraphIndex } = state;
    const paragraphs = paragraphsRef.current[currentArticleIndex];
    if (!paragraphs) return;

    if (currentParagraphIndex + 1 < paragraphs.length) {
      speakParagraph(currentArticleIndex, currentParagraphIndex + 1);
    } else if (currentArticleIndex + 1 < queue.length) {
      speakParagraph(currentArticleIndex + 1, 0);
    }
  }, [state, queue.length, speakParagraph]);

  // Skip back (prev paragraph)
  const skipBack = useCallback(() => {
    const { currentArticleIndex, currentParagraphIndex } = state;

    if (currentParagraphIndex > 0) {
      speakParagraph(currentArticleIndex, currentParagraphIndex - 1);
    } else if (currentArticleIndex > 0) {
      const prevParagraphs = paragraphsRef.current[currentArticleIndex - 1];
      speakParagraph(currentArticleIndex - 1, (prevParagraphs?.length || 1) - 1);
    }
  }, [state, speakParagraph]);

  // Add to queue
  const addToQueue = useCallback(
    (a: TTSArticle) => {
      if (!queue.find((q) => q.id === a.id)) {
        setQueue([...queue, a]);
      }
    },
    [queue, setQueue]
  );

  // Remove from queue
  const removeFromQueue = useCallback(
    (id: string) => {
      const idx = queue.findIndex((a) => a.id === id);
      if (idx === -1) return;

      const newQueue = queue.filter((a) => a.id !== id);
      setQueue(newQueue);

      // If removing the currently playing article, stop or advance
      if (idx === state.currentArticleIndex && state.isPlaying) {
        if (newQueue.length > 0) {
          const nextIdx = Math.min(idx, newQueue.length - 1);
          speakParagraph(nextIdx, 0);
        } else {
          stop();
        }
      }
    },
    [queue, state.currentArticleIndex, state.isPlaying, setQueue, speakParagraph, stop]
  );

  // Current article title
  const currentArticle = queue[state.currentArticleIndex] || article;

  // If collapsed, show mini player
  if (collapsed) {
    return (
      <TTSMiniPlayer
        articleTitle={currentArticle.title}
        isPlaying={state.isPlaying}
        onTogglePlay={togglePlayPause}
        onExpand={() => setCollapsed(false)}
        onStop={stop}
      />
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-bg-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Mic className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Listen</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowQueue((v) => !v)}
            className="relative rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
            {queue.length > 1 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={stop}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Now playing */}
      <div className="px-4 py-3">
        <p className="mb-1 line-clamp-1 text-xs font-medium text-text">
          {currentArticle.title}
        </p>

        {/* Progress bar */}
        <div className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-border">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${state.progress * 100}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Skip back */}
            <button
              onClick={skipBack}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Previous paragraph"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
              title={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={skipForward}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Next paragraph"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-2">
            <select
              value={prefs.speed}
              onChange={(e) => {
                const speed = parseFloat(e.target.value);
                updatePrefs({ speed });
                // Apply to currently playing utterance if active
                if (state.isPlaying || state.isPaused) {
                  speakParagraph(state.currentArticleIndex, state.currentParagraphIndex);
                }
              }}
              className="h-7 rounded-md border border-border bg-bg px-1.5 text-[11px] font-medium text-text outline-none"
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>

            {/* Voice selector */}
            <div className="relative">
              <button
                onClick={() => setShowVoices((v) => !v)}
                className="flex h-7 items-center gap-1 rounded-md border border-border bg-bg px-2 text-[11px] text-text-muted transition-colors hover:text-text"
                title="Voice"
              >
                <Mic className="h-3 w-3" />
                <span className="max-w-[60px] truncate">
                  {selectedVoice?.name.split(" ")[0] || "Voice"}
                </span>
              </button>
              {showVoices && (
                <div className="absolute right-0 top-8 z-50 max-h-48 w-56 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-lg">
                  {voices.map((v) => (
                    <button
                      key={v.voiceURI}
                      onClick={() => {
                        updatePrefs({ voiceURI: v.voiceURI });
                        setShowVoices(false);
                        if (state.isPlaying || state.isPaused) {
                          speakParagraph(state.currentArticleIndex, state.currentParagraphIndex);
                        }
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-hover ${
                        v.voiceURI === prefs.voiceURI ? "bg-primary/10 text-primary" : "text-text"
                      }`}
                    >
                      <span className="truncate">{v.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-text-muted">
                        {v.lang}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => updatePrefs({ volume: prefs.volume === 0 ? 1 : 0 })}
                className="rounded-lg p-1 text-text-muted transition-colors hover:text-text"
              >
                {prefs.volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.volume}
                onChange={(e) => updatePrefs({ volume: parseFloat(e.target.value) })}
                className="h-1 w-16 cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Queue panel */}
      {showQueue && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-text">
              Queue ({queue.length})
            </span>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-text-muted">No articles in queue.</p>
          ) : (
            <div className="space-y-1">
              {queue.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    i === state.currentArticleIndex && (state.isPlaying || state.isPaused)
                      ? "bg-primary/10 text-primary"
                      : "text-text hover:bg-bg-hover"
                  }`}
                >
                  {i === state.currentArticleIndex && state.isPlaying ? (
                    <Mic className="h-3 w-3 shrink-0 animate-pulse" />
                  ) : (
                    <span className="w-3 shrink-0 text-center text-[10px] text-text-muted">
                      {i + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <button
                    onClick={() => removeFromQueue(a.id)}
                    className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- TTSButton: Trigger button to start speaking an article ---

interface TTSButtonProps {
  article: TTSArticle;
  onStart?: (article: TTSArticle) => void;
  className?: string;
}

export function TTSButton({ article, onStart, className = "" }: TTSButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check if this specific article is currently being spoken
  useEffect(() => {
    function check() {
      setIsSpeaking(window.speechSynthesis.speaking);
    }
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  const handleClick = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (onStart) {
      onStart(article);
    } else {
      // Standalone mode: just speak the article directly
      const prefs = loadPrefs();
      const text = `${article.title}. ${article.summary}`;
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = prefs.speed;
      utt.volume = prefs.volume;

      const voices = window.speechSynthesis.getVoices();
      if (prefs.voiceURI) {
        const v = voices.find((v) => v.voiceURI === prefs.voiceURI);
        if (v) utt.voice = v;
      }

      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
      setIsSpeaking(true);
    }
  }, [article, isSpeaking, onStart]);

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        isSpeaking
          ? "bg-primary/10 text-primary"
          : "text-text-muted hover:bg-bg-hover hover:text-text"
      } ${className}`}
      title={isSpeaking ? "Stop listening" : "Listen to article"}
    >
      {isSpeaking ? (
        <>
          <Pause className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Listening...</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Listen</span>
        </>
      )}
    </button>
  );
}

// --- TTSMiniPlayer: Floating bottom bar ---

interface TTSMiniPlayerProps {
  articleTitle: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand?: () => void;
  onStop?: () => void;
  className?: string;
}

export function TTSMiniPlayer({
  articleTitle,
  isPlaying,
  onTogglePlay,
  onExpand,
  onStop,
  className = "",
}: TTSMiniPlayerProps) {
  return (
    <div
      className={`fixed bottom-4 left-1/2 z-50 flex w-[90%] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-2.5 shadow-lg ${className}`}
    >
      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text">{articleTitle}</p>
        <p className="text-[10px] text-text-muted">
          {isPlaying ? "Now playing" : "Paused"}
        </p>
      </div>

      {/* Expand */}
      {onExpand && (
        <button
          onClick={onExpand}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title="Expand"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Close */}
      {onStop && (
        <button
          onClick={onStop}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title="Stop"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
