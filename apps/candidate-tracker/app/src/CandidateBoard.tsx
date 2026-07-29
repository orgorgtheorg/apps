import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Mail,
  MessageSquare,
  Plus,
  Search,
  StickyNote,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

// ── stages ────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "applied", label: "Applied", dot: "#38bdf8" },
  { id: "screening", label: "Screening", dot: "#a78bfa" },
  { id: "interview", label: "Interview", dot: "#fbbf24" },
  { id: "offer", label: "Offer", dot: "#34d399" },
] as const;
const CLOSED = [
  { id: "hired", label: "Hired", dot: "#34d399" },
  { id: "rejected", label: "Rejected", dot: "#f87171" },
] as const;
type StageId = (typeof STAGES)[number]["id"] | (typeof CLOSED)[number]["id"];

const stageMeta = (id: StageId) =>
  [...STAGES, ...CLOSED].find((s) => s.id === id) ?? STAGES[0];
const nextStage = (id: StageId): StageId | null => {
  const i = STAGES.findIndex((s) => s.id === id);
  if (i >= 0 && i < STAGES.length - 1) return STAGES[i + 1].id;
  return id === "offer" ? "hired" : null;
};

// ── helpers ───────────────────────────────────────────────────────────────
const daysIdle = (c: Doc<"candidates">) =>
  Math.floor((Date.now() - c.lastTouchedAt) / 86_400_000);

const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

// Stable decorative hue per candidate for the avatar.
const hueOf = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

function IdleBadge({ days }: { days: number }) {
  if (days < 3) return null;
  const hot = days >= 7;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        hot ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
      }`}
      title={`No activity for ${days} days`}
    >
      {hot ? <Flame className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {days}d
    </span>
  );
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const hue = hueOf(name);
  return (
    <span
      className="flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `oklch(0.32 0.06 ${hue})`,
        color: `oklch(0.85 0.08 ${hue})`,
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}

// ── root ──────────────────────────────────────────────────────────────────
export default function CandidateBoard() {
  const candidates = useQuery(api.candidates.list);
  const stale = useQuery(api.candidates.stale) ?? [];

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"candidates"> | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const all = candidates ?? [];
  const q = search.trim().toLowerCase();
  const visible = q
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
      )
    : all;
  const closed = visible.filter((c) => CLOSED.some((s) => s.id === c.stage));
  const selected = all.find((c) => c._id === selectedId) ?? null;
  const roleCount = useMemo(
    () => new Set(all.map((c) => c.role.toLowerCase())).size,
    [all],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Candidates</h1>
            <p className="text-xs text-muted-foreground">
              {all.length === 0
                ? "Your hiring pipeline"
                : `${all.length - closed.length} in play · ${roleCount} role${roleCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or role…"
              className="h-8 w-44 pl-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="h-8"
            onClick={() => setAddOpen((v) => !v)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add candidate
          </Button>
        </div>

        {/* stale attention strip */}
        {stale.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{stale.length} going cold —</span>
            {stale.slice(0, 4).map((s) => (
              <button
                key={s.id}
                className="underline-offset-2 hover:underline"
                onClick={() => setSelectedId(s.id)}
              >
                {s.name} ({s.daysIdle}d)
              </button>
            ))}
            {stale.length > 4 && <span>+{stale.length - 4} more</span>}
          </div>
        )}

        {addOpen && <AddForm onDone={() => setAddOpen(false)} />}

        {/* board */}
        {candidates === undefined ? (
          <div className="py-24 text-center text-sm text-muted-foreground">
            Loading the board…
          </div>
        ) : all.length === 0 ? (
          <EmptyHero onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="grid min-w-[720px] grid-cols-4 gap-3">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  candidates={visible.filter((c) => c.stage === stage.id)}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </div>
        )}

        {/* hired & rejected */}
        {closed.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowClosed((v) => !v)}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${showClosed ? "rotate-90" : ""}`}
              />
              Hired & rejected ({closed.length})
            </button>
            {showClosed && (
              <div className="mt-2 flex flex-wrap gap-2">
                {closed.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedId(c._id)}
                    className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-xs hover:border-muted-foreground/40"
                  >
                    <Avatar name={c.name} size={22} />
                    <span className="font-medium">{c.name}</span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: stageMeta(c.stage as StageId).dot }}
                    />
                    <span className="text-muted-foreground">
                      {stageMeta(c.stage as StageId).label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <DetailSheet candidate={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

// ── columns & cards ───────────────────────────────────────────────────────
function StageColumn({
  stage,
  candidates,
  onSelect,
}: {
  stage: (typeof STAGES)[number];
  candidates: Doc<"candidates">[];
  onSelect: (id: Id<"candidates">) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: stage.dot }}
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {stage.label}
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {candidates.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground/60">
            No one yet
          </div>
        ) : (
          candidates.map((c) => (
            <CandidateCard key={c._id} candidate={c} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  onSelect,
}: {
  candidate: Doc<"candidates">;
  onSelect: (id: Id<"candidates">) => void;
}) {
  const move = useMutation(api.candidates.move);
  const idle = daysIdle(candidate);
  const next = nextStage(candidate.stage as StageId);
  const lastNote = candidate.notes[candidate.notes.length - 1];

  return (
    <div
      className="group cursor-pointer rounded-lg border border-border bg-card p-2.5 shadow-sm transition-colors hover:border-muted-foreground/40"
      onClick={() => onSelect(candidate._id)}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium leading-tight">
              {candidate.name}
            </span>
            <IdleBadge days={idle} />
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {candidate.role}
          </div>
        </div>
        {next && (
          <button
            className="invisible rounded-md border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-foreground group-hover:visible"
            title={`Advance to ${stageMeta(next).label}`}
            onClick={(e) => {
              e.stopPropagation();
              void move({ id: candidate._id, stage: next });
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {lastNote && (
        <div className="mt-2 flex items-start gap-1.5 border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{lastNote.text}</span>
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/70">
        {candidate.notes.length > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" /> {candidate.notes.length}
          </span>
        )}
        {candidate.email && <Mail className="h-3 w-3" />}
        <span className="ml-auto">{fmtDay(candidate.createdAt)}</span>
      </div>
    </div>
  );
}

// ── add form ──────────────────────────────────────────────────────────────
function AddForm({ onDone }: { onDone: () => void }) {
  const create = useMutation(api.candidates.create);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && role.trim();

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await create({
        name,
        role,
        email: email.trim() || undefined,
        note: note.trim() || undefined,
        source: "manual",
      });
      setName("");
      setEmail("");
      setNote("");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-8 text-sm"
        />
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. Dispatcher)"
          className="h-8 text-sm"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="h-8 text-sm"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="First note (optional)"
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          New candidates land in Applied. Tip: drop a resume in chat and ask
          your agent to file it.
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7" onClick={onDone}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7"
            disabled={!ok || busy}
            onClick={() => void submit()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────────
function EmptyHero({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <div className="flex -space-x-2">
        {STAGES.map((s) => (
          <span
            key={s.id}
            className="h-9 w-9 rounded-full border-2 border-background"
            style={{
              background: `color-mix(in oklab, ${s.dot} 35%, transparent)`,
            }}
          />
        ))}
      </div>
      <div>
        <div className="text-sm font-medium">No candidates yet</div>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Add someone below — or drop resumes into the chat and ask your agent
          to file them. It keeps this board current and nags when anyone sits
          untouched for 3+ days.
        </p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add your first candidate
      </Button>
    </div>
  );
}

// ── detail sheet ──────────────────────────────────────────────────────────
function DetailSheet({
  candidate,
  onClose,
}: {
  candidate: Doc<"candidates">;
  onClose: () => void;
}) {
  const move = useMutation(api.candidates.move);
  const addNote = useMutation(api.candidates.addNote);
  const remove = useMutation(api.candidates.remove);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const idle = daysIdle(candidate);
  const isClosed = CLOSED.some((s) => s.id === candidate.stage);

  const submitNote = async () => {
    if (!note.trim()) return;
    await addNote({ id: candidate._id, text: note });
    setNote("");
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* head */}
        <div className="flex items-start gap-3 border-b border-border p-4">
          <Avatar name={candidate.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">
                {candidate.name}
              </h2>
              <IdleBadge days={idle} />
            </div>
            <div className="text-sm text-muted-foreground">
              {candidate.role}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {candidate.email && (
                <a
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  href={`mailto:${candidate.email}`}
                >
                  <Mail className="h-3 w-3" /> {candidate.email}
                </a>
              )}
              {candidate.source && <span>via {candidate.source}</span>}
              <span>added {fmtDay(candidate.createdAt)}</span>
            </div>
          </div>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* stage stepper */}
        <div className="border-b border-border p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Stage
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => {
              const active = candidate.stage === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => void move({ id: candidate._id, stage: s.id })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: s.dot }}
                  />
                  {s.label}
                  {active && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={candidate.stage === "hired" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => void move({ id: candidate._id, stage: "hired" })}
            >
              <Check className="mr-1 h-3 w-3" /> Hired
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`h-7 text-xs ${candidate.stage === "rejected" ? "border-red-500/50 text-red-400" : ""}`}
              onClick={() =>
                void move({ id: candidate._id, stage: "rejected" })
              }
            >
              Reject
            </Button>
            {isClosed && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() =>
                  void move({ id: candidate._id, stage: "applied" })
                }
              >
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* notes */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notes ({candidate.notes.length})
          </div>
          {candidate.notes.length === 0 ? (
            <p className="text-xs text-muted-foreground/70">
              Nothing yet. Screen notes, call takeaways, and forwarded-email
              summaries land here — yours and your agent&apos;s.
            </p>
          ) : (
            <ol className="space-y-3">
              {[...candidate.notes].reverse().map((n, i) => (
                <li key={i} className="rounded-lg bg-secondary/50 p-2.5">
                  <div className="whitespace-pre-wrap text-sm">{n.text}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {fmtDay(n.at)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* note composer + delete */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && void submitNote()}
            />
            <Button
              size="sm"
              className="h-8"
              disabled={!note.trim()}
              onClick={() => void submitNote()}
            >
              Add
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Delete {candidate.name} and all notes?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-xs"
                  onClick={() => {
                    void remove({ id: candidate._id });
                    onClose();
                  }}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
              </div>
            ) : (
              <button
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-red-400"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3 w-3" /> Remove candidate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
