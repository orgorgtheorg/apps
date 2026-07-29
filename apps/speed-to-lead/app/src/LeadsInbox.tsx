import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Clock,
  Flame,
  Inbox,
  Mail,
  PauseCircle,
  Phone,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

// ── SLA clock ─────────────────────────────────────────────────────────────
// The single glyph the whole app is about: how long this person has waited.
const GREEN_UNTIL_MIN = 15;
const AMBER_UNTIL_MIN = 60;

const minutesSince = (ts: number) => Math.floor((Date.now() - ts) / 60_000);

const fmtDuration = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / (60 * 24))}d`;
};

function SlaClock({ lead }: { lead: Doc<"leads"> }) {
  const answered = lead.answeredAt !== undefined;
  const elapsed = answered
    ? Math.floor(((lead.answeredAt as number) - lead.arrivedAt) / 60_000)
    : minutesSince(lead.arrivedAt);
  const tone = answered
    ? "text-emerald-400"
    : elapsed <= GREEN_UNTIL_MIN
      ? "text-emerald-400"
      : elapsed <= AMBER_UNTIL_MIN
        ? "text-amber-400"
        : "text-red-400";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-xs tabular-nums ${tone}`}
      title={
        answered
          ? "Time to first reply"
          : "Waiting since the message arrived — this is the number that closes deals"
      }
    >
      {answered ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {fmtDuration(elapsed)}
    </span>
  );
}

const INTENTS: Record<string, string> = {
  quote: "Quote",
  question: "Question",
  booking: "Booking",
  complaint: "Complaint",
  spam: "Spam",
  other: "Other",
};

// ── root ──────────────────────────────────────────────────────────────────
export default function LeadsInbox() {
  const leads = useQuery(api.leads.list);
  const stats = useQuery(api.leads.stats);
  const [selectedId, setSelectedId] = useState<Id<"leads"> | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const all = leads ?? [];
  const visible = all.filter((l) =>
    showClosed ? true : l.status !== "closed" && l.status !== "answered",
  );
  const selected = all.find((l) => l._id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold leading-tight">Leads</h1>
          <p className="text-xs text-muted-foreground">
            {stats?.medianMinutes === null || stats === undefined
              ? "Inbound inquiries and their reply clock"
              : `Median response ${fmtDuration(stats.medianMinutes)} · ${stats.thisWeek} this week`}
          </p>
        </div>
        <button
          className={`rounded-full border px-2.5 py-1 text-xs ${
            showClosed
              ? "border-transparent bg-secondary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setShowClosed((v) => !v)}
        >
          {showClosed ? "Showing all" : "Open only"}
        </button>
      </div>

      {leads === undefined ? (
        <div className="py-24 text-center text-sm text-muted-foreground">
          Loading the inbox…
        </div>
      ) : all.length === 0 ? (
        <EmptyHero />
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* list */}
          <div className="w-full max-w-sm shrink-0 overflow-y-auto border-r border-border">
            {visible.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Nothing waiting. Every lead has been answered.
              </p>
            ) : (
              visible.map((lead) => (
                <LeadRow
                  key={lead._id}
                  lead={lead}
                  active={selected?._id === lead._id}
                  onSelect={() => setSelectedId(lead._id)}
                />
              ))
            )}
          </div>

          {/* draft pane */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selected ? (
              <DraftPane key={selected._id} lead={selected} />
            ) : (
              <p className="p-8 text-sm text-muted-foreground">
                Pick a lead to see the drafted reply.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── list row ──────────────────────────────────────────────────────────────
function LeadRow({
  lead,
  active,
  onSelect,
}: {
  lead: Doc<"leads">;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full flex-col gap-1 border-b border-border/60 px-3 py-2.5 text-left transition-colors ${
        active ? "bg-secondary/60" : "hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium">{lead.name}</span>
        {lead.hot && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
            title={lead.hotReason ?? "Mentions budget or timeline"}
          >
            <Flame className="h-3 w-3" /> hot
          </span>
        )}
        <span className="ml-auto">
          <SlaClock lead={lead} />
        </span>
      </div>
      <div className="truncate text-xs text-muted-foreground">
        {lead.excerpt}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
        <span className="rounded-full bg-secondary px-1.5 py-0.5">
          {INTENTS[lead.intent] ?? lead.intent}
        </span>
        <span>{lead.source}</span>
        <span className="ml-auto capitalize">{lead.status}</span>
      </div>
    </button>
  );
}

// ── draft pane ────────────────────────────────────────────────────────────
function DraftPane({ lead }: { lead: Doc<"leads"> }) {
  const setDraft = useMutation(api.leads.setDraft);
  const setStatus = useMutation(api.leads.setStatus);
  const addNote = useMutation(api.leads.addNote);
  const remove = useMutation(api.leads.remove);
  const [draft, setLocalDraft] = useState(lead.draft ?? "");
  const [note, setNote] = useState("");
  const dirty = draft !== (lead.draft ?? "");

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* who */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{lead.name}</h2>
          <SlaClock lead={lead} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {lead.email && (
            <a
              className="inline-flex items-center gap-1 hover:text-foreground"
              href={`mailto:${lead.email}`}
            >
              <Mail className="h-3 w-3" /> {lead.email}
            </a>
          )}
          {lead.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {lead.phone}
            </span>
          )}
          <span>via {lead.source}</span>
          <span>
            arrived{" "}
            {new Date(lead.arrivedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* what they wrote */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {lead.subject ?? "Their message"}
        </div>
        <p className="whitespace-pre-wrap text-sm">{lead.excerpt}</p>
      </div>

      {/* the draft */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Drafted reply
          </span>
          {lead.status === "answered" && (
            <span className="text-[11px] text-emerald-400">sent</span>
          )}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setLocalDraft(e.target.value)}
          rows={10}
          placeholder="Your agent hasn't drafted this one yet — it will on its next pass, or you can write it here."
          className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-muted-foreground/50"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-8"
            disabled={!draft.trim()}
            onClick={() => {
              if (dirty) {
                void setDraft({ id: lead._id, draft });
              }
              void setStatus({ id: lead._id, status: "approved" });
            }}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> Approve — agent sends
          </Button>
          {dirty && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => void setDraft({ id: lead._id, draft })}
            >
              Save edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void setStatus({ id: lead._id, status: "held" })}
          >
            <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> Hold
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => void setStatus({ id: lead._id, status: "answered" })}
          >
            I replied myself
          </Button>
          <button
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-red-400"
            onClick={() => void remove({ id: lead._id })}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Approving queues the send for your agent — nothing leaves without this
          click unless you turned on auto-send for this lead type.
        </p>
      </div>

      {/* notes */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notes ({lead.notes.length})
        </div>
        <ol className="space-y-2">
          {[...lead.notes].reverse().map((n, i) => (
            <li key={i} className="rounded-lg bg-secondary/50 p-2 text-sm">
              {n.text}
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(n.at).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && note.trim()) {
                void addNote({ id: lead._id, text: note });
                setNote("");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────────
function EmptyHero() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/50" />
      <div className="text-sm font-medium">No leads yet</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Your agent files every inbound inquiry here the moment it arrives, with
        a personalized reply already drafted. The clock next to each name is how
        long that person has been waiting — green under 15 minutes, red past an
        hour.
      </p>
    </div>
  );
}
