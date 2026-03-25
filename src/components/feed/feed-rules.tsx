"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Zap,
  GitBranch,
  Filter,
  Settings2,
  Play,
  Pause,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  FlaskConical,
  Copy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TriggerType = "new_article" | "keyword_match" | "source_match";

interface Condition {
  id: string;
  type: "source_contains" | "title_contains" | "topic_is" | "sentiment_is";
  value: string;
}

type ConditionLogic = "AND" | "OR";

type ActionType =
  | "auto_bookmark"
  | "auto_read"
  | "add_tag"
  | "send_notification"
  | "add_to_collection"
  | "highlight_color";

interface RuleAction {
  type: ActionType;
  value?: string;
}

export interface FeedRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerType;
  conditionLogic: ConditionLogic;
  conditions: Condition[];
  action: RuleAction;
  createdAt: string;
  matchCount: number;
}

export interface RuleActionResult {
  itemId: string;
  ruleId: string;
  ruleName: string;
  action: RuleAction;
}

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "feedbot-rules";

const TRIGGERS: { value: TriggerType; label: string }[] = [
  { value: "new_article", label: "New article arrives" },
  { value: "keyword_match", label: "Article matches keyword" },
  { value: "source_match", label: "Article from source" },
];

const CONDITION_TYPES: { value: Condition["type"]; label: string }[] = [
  { value: "source_contains", label: "Source contains" },
  { value: "title_contains", label: "Title contains" },
  { value: "topic_is", label: "Topic is" },
  { value: "sentiment_is", label: "Sentiment is" },
];

const TOPICS = ["AI", "Tech", "Science", "Business", "Health", "Politics", "Sports", "Entertainment"];
const SENTIMENTS = ["positive", "negative", "neutral"];

const ACTION_TYPES: { value: ActionType; label: string; needsValue: boolean; placeholder?: string }[] = [
  { value: "auto_bookmark", label: "Auto-bookmark", needsValue: false },
  { value: "auto_read", label: "Auto-mark as read", needsValue: false },
  { value: "add_tag", label: "Add tag", needsValue: true, placeholder: "Tag name" },
  { value: "send_notification", label: "Send notification", needsValue: false },
  { value: "add_to_collection", label: "Add to collection", needsValue: true, placeholder: "Collection name" },
  { value: "highlight_color", label: "Highlight with color", needsValue: true },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#facc15" },
  { name: "Green", value: "#4ade80" },
  { name: "Blue", value: "#60a5fa" },
  { name: "Pink", value: "#f472b6" },
  { name: "Orange", value: "#fb923c" },
  { name: "Purple", value: "#a78bfa" },
];

const DEFAULT_RULES: FeedRule[] = [
  {
    id: "starter-1",
    name: "Bookmark AI articles",
    enabled: true,
    trigger: "new_article",
    conditionLogic: "AND",
    conditions: [
      { id: "c1", type: "title_contains", value: "AI" },
    ],
    action: { type: "auto_bookmark" },
    createdAt: new Date().toISOString(),
    matchCount: 0,
  },
  {
    id: "starter-2",
    name: "Tag breaking business news",
    enabled: true,
    trigger: "keyword_match",
    conditionLogic: "AND",
    conditions: [
      { id: "c2", type: "topic_is", value: "Business" },
      { id: "c3", type: "title_contains", value: "breaking" },
    ],
    action: { type: "add_tag", value: "breaking" },
    createdAt: new Date().toISOString(),
    matchCount: 0,
  },
  {
    id: "starter-3",
    name: "Notify on Science discoveries",
    enabled: false,
    trigger: "new_article",
    conditionLogic: "OR",
    conditions: [
      { id: "c4", type: "topic_is", value: "Science" },
      { id: "c5", type: "title_contains", value: "discovery" },
    ],
    action: { type: "send_notification" },
    createdAt: new Date().toISOString(),
    matchCount: 0,
  },
];

// ---------------------------------------------------------------------------
// Engine (pure function)
// ---------------------------------------------------------------------------

function matchesCondition(item: FeedItem, condition: Condition): boolean {
  const lower = (s: string) => s.toLowerCase();
  switch (condition.type) {
    case "source_contains":
      return lower(item.source).includes(lower(condition.value));
    case "title_contains":
      return lower(item.title).includes(lower(condition.value));
    case "topic_is":
      // Heuristic: check title + summary for the topic keyword
      return (
        lower(item.title).includes(lower(condition.value)) ||
        lower(item.summary).includes(lower(condition.value))
      );
    case "sentiment_is":
      // Simple keyword-based sentiment heuristic
      const text = lower(item.title + " " + item.summary);
      const positiveWords = ["great", "success", "win", "breakthrough", "growth", "improve", "positive", "gain", "benefit"];
      const negativeWords = ["fail", "crash", "loss", "decline", "crisis", "problem", "negative", "risk", "threat", "drop"];
      const posScore = positiveWords.filter((w) => text.includes(w)).length;
      const negScore = negativeWords.filter((w) => text.includes(w)).length;
      if (condition.value === "positive") return posScore > negScore;
      if (condition.value === "negative") return negScore > posScore;
      return posScore === negScore; // neutral
    default:
      return false;
  }
}

function itemMatchesRule(item: FeedItem, rule: FeedRule): boolean {
  if (rule.conditions.length === 0) return true;
  if (rule.conditionLogic === "AND") {
    return rule.conditions.every((c) => matchesCondition(item, c));
  }
  return rule.conditions.some((c) => matchesCondition(item, c));
}

export function FeedRulesEngine(
  items: FeedItem[],
  rules: FeedRule[]
): RuleActionResult[] {
  const results: RuleActionResult[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const item of items) {
      if (itemMatchesRule(item, rule)) {
        results.push({
          itemId: item.id,
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
        });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function triggerLabel(t: TriggerType): string {
  return TRIGGERS.find((tr) => tr.value === t)?.label ?? t;
}

function conditionLabel(c: Condition): string {
  const typeLabel = CONDITION_TYPES.find((ct) => ct.value === c.type)?.label ?? c.type;
  return `${typeLabel} "${c.value}"`;
}

function actionLabel(a: RuleAction): string {
  const info = ACTION_TYPES.find((at) => at.value === a.type);
  if (!info) return a.type;
  if (a.value) return `${info.label}: ${a.value}`;
  return info.label;
}

function rulePreview(rule: Pick<FeedRule, "trigger" | "conditionLogic" | "conditions" | "action">): string {
  const parts: string[] = [`When ${triggerLabel(rule.trigger).toLowerCase()}`];
  if (rule.conditions.length > 0) {
    const joined = rule.conditions
      .map((c) => conditionLabel(c))
      .join(` ${rule.conditionLogic} `);
    parts.push(joined);
  }
  parts.push(`-> ${actionLabel(rule.action)}`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const needsDropdown = condition.type === "topic_is" || condition.type === "sentiment_is";
  const options = condition.type === "topic_is" ? TOPICS : SENTIMENTS;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={condition.type}
        onChange={(e) =>
          onChange({ ...condition, type: e.target.value as Condition["type"], value: "" })
        }
        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
      >
        {CONDITION_TYPES.map((ct) => (
          <option key={ct.value} value={ct.value}>
            {ct.label}
          </option>
        ))}
      </select>

      {needsDropdown ? (
        <select
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
        >
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Enter text..."
          className="w-36 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
        />
      )}

      <button
        onClick={onRemove}
        className="rounded p-1 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ActionEditor({
  action,
  onChange,
}: {
  action: RuleAction;
  onChange: (a: RuleAction) => void;
}) {
  const info = ACTION_TYPES.find((a2) => a2.value === action.type);
  const isColor = action.type === "highlight_color";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value as ActionType, value: "" })}
        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
      >
        {ACTION_TYPES.map((at) => (
          <option key={at.value} value={at.value}>
            {at.label}
          </option>
        ))}
      </select>

      {info?.needsValue && !isColor && (
        <input
          type="text"
          value={action.value ?? ""}
          onChange={(e) => onChange({ ...action, value: e.target.value })}
          placeholder={info.placeholder}
          className="w-36 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
        />
      )}

      {isColor && (
        <div className="flex gap-1.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange({ ...action, value: c.value })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                action.value === c.value ? "scale-110 border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3;

function RuleWizard({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FeedRule;
  onSave: (rule: FeedRule) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState<TriggerType>(initial?.trigger ?? "new_article");
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>(initial?.conditionLogic ?? "AND");
  const [conditions, setConditions] = useState<Condition[]>(
    initial?.conditions ?? []
  );
  const [action, setAction] = useState<RuleAction>(initial?.action ?? { type: "auto_bookmark" });

  const updateCondition = useCallback((id: string, updated: Condition) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: uid(), type: "title_contains", value: "" },
    ]);
  };

  const preview = rulePreview({ trigger, conditionLogic, conditions, action });

  const canProceed = (): boolean => {
    if (step === 1) return true;
    if (step === 2) return conditions.length === 0 || conditions.every((c) => c.value.trim() !== "");
    if (step === 3) {
      const info = ACTION_TYPES.find((a) => a.value === action.type);
      if (info?.needsValue && !action.value?.trim()) return false;
      return name.trim() !== "";
    }
    return true;
  };

  const handleSave = () => {
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      enabled: initial?.enabled ?? true,
      trigger,
      conditionLogic,
      conditions,
      action,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      matchCount: initial?.matchCount ?? 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                s === step
                  ? "bg-primary text-white"
                  : s < step
                  ? "bg-green-500/20 text-green-400"
                  : "bg-bg text-text-muted"
              }`}
            >
              {s < step ? <Check className="h-3 w-3" /> : s}
            </div>
            <span className={`text-[10px] ${s === step ? "font-medium text-text" : "text-text-muted"}`}>
              {s === 1 ? "Trigger" : s === 2 ? "Conditions" : "Action"}
            </span>
            {s < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Trigger */}
      {step === 1 && (
        <div className="rounded-lg border border-border bg-bg p-3">
          <p className="mb-2 text-xs font-medium text-text">When should this rule fire?</p>
          <div className="space-y-2">
            {TRIGGERS.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  trigger === t.value
                    ? "border-primary bg-primary/5 text-text"
                    : "border-border text-text-muted hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="trigger"
                  value={t.value}
                  checked={trigger === t.value}
                  onChange={() => setTrigger(t.value)}
                  className="sr-only"
                />
                <Zap className={`h-3.5 w-3.5 ${trigger === t.value ? "text-primary" : ""}`} />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Conditions */}
      {step === 2 && (
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-text">Filter conditions</p>
            {conditions.length > 1 && (
              <button
                onClick={() => setConditionLogic((l) => (l === "AND" ? "OR" : "AND"))}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20"
              >
                {conditionLogic}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={c.id}>
                {i > 0 && (
                  <p className="my-1 text-center text-[10px] font-medium text-text-muted">
                    {conditionLogic}
                  </p>
                )}
                <ConditionEditor
                  condition={c}
                  onChange={(updated) => updateCondition(c.id, updated)}
                  onRemove={() => removeCondition(c.id)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={addCondition}
            className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" />
            Add condition
          </button>

          {conditions.length === 0 && (
            <p className="mt-1 text-[10px] text-text-muted">
              No conditions = rule matches all articles for the trigger.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Action + Name */}
      {step === 3 && (
        <div className="rounded-lg border border-border bg-bg p-3">
          <p className="mb-2 text-xs font-medium text-text">What should happen?</p>
          <ActionEditor action={action} onChange={setAction} />

          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-text">Rule name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bookmark AI articles"
              className="w-full rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-lg bg-primary/5 px-3 py-2">
        <p className="text-[10px] font-medium text-primary">Preview</p>
        <p className="mt-0.5 text-xs text-text">{preview}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as WizardStep)}
          className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>
        <button
          onClick={step === 3 ? handleSave : () => setStep((s) => (s + 1) as WizardStep)}
          disabled={!canProceed()}
          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {step === 3 ? (initial ? "Update Rule" : "Create Rule") : "Next"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Results
// ---------------------------------------------------------------------------

function TestResults({
  items,
  rule,
  onClose,
}: {
  items: FeedItem[];
  rule: FeedRule;
  onClose: () => void;
}) {
  const matched = useMemo(
    () => items.filter((item) => itemMatchesRule(item, rule)),
    [items, rule]
  );

  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-medium text-text">
            Test: {matched.length} of {items.length} articles match
          </span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {matched.length === 0 ? (
        <p className="text-[10px] text-text-muted">No articles match this rule.</p>
      ) : (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {matched.slice(0, 20).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-[11px] text-text hover:bg-bg-hover/50"
            >
              <Check className="h-3 w-3 shrink-0 text-green-400" />
              <span className="truncate">{item.title}</span>
              <span className="ml-auto shrink-0 text-text-muted">{item.source}</span>
            </div>
          ))}
          {matched.length > 20 && (
            <p className="text-[10px] text-text-muted">...and {matched.length - 20} more</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface FeedRulesPanelProps {
  items?: FeedItem[];
}

export function FeedRulesPanel({ items = [] }: FeedRulesPanelProps) {
  const [rules, setRules] = useState<FeedRule[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingRule, setEditingRule] = useState<FeedRule | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Load rules from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRules(JSON.parse(saved));
      } else {
        setRules(DEFAULT_RULES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
      }
    } catch {
      setRules(DEFAULT_RULES);
    }
  }, []);

  const persist = useCallback((next: FeedRule[]) => {
    setRules(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const toggleRule = useCallback(
    (id: string) => {
      persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    },
    [rules, persist]
  );

  const deleteRule = useCallback(
    (id: string) => {
      persist(rules.filter((r) => r.id !== id));
      if (testingRuleId === id) setTestingRuleId(null);
    },
    [rules, persist, testingRuleId]
  );

  const duplicateRule = useCallback(
    (rule: FeedRule) => {
      const copy: FeedRule = {
        ...rule,
        id: uid(),
        name: `${rule.name} (copy)`,
        matchCount: 0,
        createdAt: new Date().toISOString(),
      };
      persist([...rules, copy]);
    },
    [rules, persist]
  );

  const handleSave = useCallback(
    (rule: FeedRule) => {
      const exists = rules.find((r) => r.id === rule.id);
      if (exists) {
        persist(rules.map((r) => (r.id === rule.id ? rule : r)));
      } else {
        persist([...rules, rule]);
      }
      setShowWizard(false);
      setEditingRule(null);
    },
    [rules, persist]
  );

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Feed Rules</h3>
          {enabledCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {enabledCount} active
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Wizard */}
          {(showWizard || editingRule) && (
            <RuleWizard
              initial={editingRule ?? undefined}
              onSave={handleSave}
              onCancel={() => {
                setShowWizard(false);
                setEditingRule(null);
              }}
            />
          )}

          {/* Test Results */}
          {testingRuleId && (
            <>
              {(() => {
                const rule = rules.find((r) => r.id === testingRuleId);
                if (!rule) return null;
                return (
                  <TestResults
                    items={items}
                    rule={rule}
                    onClose={() => setTestingRuleId(null)}
                  />
                );
              })()}
            </>
          )}

          {/* Rules List */}
          {!showWizard && !editingRule && (
            <>
              {rules.length === 0 ? (
                <p className="text-xs text-text-muted">
                  No rules yet. Create one to automate your feed.
                </p>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`rounded-lg border px-3 py-2 transition-colors ${
                        rule.enabled
                          ? "border-border bg-bg"
                          : "border-border/50 bg-bg/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Toggle */}
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={`flex h-5 w-5 items-center justify-center rounded ${
                            rule.enabled
                              ? "bg-primary/10 text-primary"
                              : "bg-bg-hover text-text-muted"
                          }`}
                          title={rule.enabled ? "Disable rule" : "Enable rule"}
                        >
                          {rule.enabled ? (
                            <Play className="h-3 w-3" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                        </button>

                        {/* Name + Preview */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-medium text-text">
                              {rule.name}
                            </span>
                            {rule.matchCount > 0 && (
                              <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-medium text-secondary">
                                {rule.matchCount} matches
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[10px] text-text-muted">
                            {rulePreview(rule)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setTestingRuleId(testingRuleId === rule.id ? null : rule.id)}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-secondary/10 hover:text-secondary"
                            title="Test rule"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateRule(rule)}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Duplicate rule"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Edit rule"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Delete rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Rule Button */}
              <button
                onClick={() => setShowWizard(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                New Rule
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
