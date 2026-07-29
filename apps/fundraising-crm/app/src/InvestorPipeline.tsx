import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, CalendarClock, Trash2, X } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const STAGES = [
  { id: "researching", label: "Researching" },
  { id: "introduced", label: "Intro'd" },
  { id: "met", label: "Met" },
  { id: "partnerMeeting", label: "Partner mtg" },
  { id: "terms", label: "Terms" },
] as const;

type StageId = (typeof STAGES)[number]["id"] | "closed" | "passed";

const nextStage = (id: StageId): StageId | null => {
  const i = STAGES.findIndex((s) => s.id === id);
  if (i >= 0 && i < STAGES.length - 1) return STAGES[i + 1].id;
  return id === "terms" ? "closed" : null;
};

const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export default function InvestorPipeline() {
  const investors = useQuery(api.investors.list);
  const momentum = useQuery(api.investors.momentum);
  const due = useQuery(api.investors.dueFollowUps) ?? [];
  const create = useMutation(api.investors.create);
  const [selectedId, setSelectedId] = useState<Id<"investors"> | null>(null);
  const [firm, setFirm] = useState("");

  const all = investors ?? [];
  const selected = all.find((i) => i._id === selectedId) ?? null;
  const closed = all.filter(
    (i) => i.stage === "closed" || i.stage === "passed",
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Raise</h1>
            <p className="text-xs text-muted-foreground">
              {momentum
                ? `${momentum.active} active · ${momentum.meetingsThisWeek} meetings this week · ${momentum.newIntrosThisWeek} new intros${
                    momentum.daysSinceTermsMovement === null
                      ? ""
                      : ` · ${momentum.daysSinceTermsMovement}d since terms movement`
                  }`
                : "Researching → Intro'd → Met → Partner → Terms"}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              placeholder="Add a firm…"
              className="h-8 w-44 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && firm.trim()) {
                  void create({ firm });
                  setFirm("");
                }
              }}
            />
          </div>
        </div>

        {due.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Follow-ups due —</span>
            {due.slice(0, 4).map((d) => (
              <span key={d.id} title={d.why ?? undefined}>
                {d.firm}
                {d.daysLate > 0 ? ` (${d.daysLate}d late)` : ""}
              </span>
            ))}
          </div>
        )}

        {investors === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : all.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <div className="text-sm font-medium">No investors yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Add a firm above, or just tell your agent who you&apos;re talking
              to. After each pitch, record a voice debrief and the card updates
              itself — including the &quot;circle back in two weeks&quot; that
              becomes a dated follow-up.
            </p>
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="grid min-w-[900px] grid-cols-5 gap-3">
              {STAGES.map((stage) => (
                <div key={stage.id} className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {stage.label}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {all.filter((i) => i.stage === stage.id).length}
                    </span>
                  </div>
                  {all
                    .filter((i) => i.stage === stage.id)
                    .map((investor) => (
                      <Card
                        key={investor._id}
                        investor={investor}
                        onSelect={() => setSelectedId(investor._id)}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {closed.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Closed & passed ({closed.length})
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {closed.map((i) => (
                <li key={i._id} className="flex gap-2">
                  <button
                    className="font-medium hover:text-foreground"
                    onClick={() => setSelectedId(i._id)}
                  >
                    {i.firm}
                  </button>
                  <span className="capitalize">{i.stage}</span>
                  {i.passReason && (
                    <span className="min-w-0 flex-1 truncate">
                      — &ldquo;{i.passReason}&rdquo;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {selected && (
        <Detail investor={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function Card({
  investor,
  onSelect,
}: {
  investor: Doc<"investors">;
  onSelect: () => void;
}) {
  const move = useMutation(api.investors.move);
  const next = nextStage(investor.stage as StageId);
  const lastNote = investor.notes[investor.notes.length - 1];

  return (
    <div
      className="group cursor-pointer rounded-lg border border-border bg-card p-2.5"
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{investor.firm}</div>
          {investor.partner && (
            <div className="truncate text-xs text-muted-foreground">
              {investor.partner}
            </div>
          )}
        </div>
        {next && (
          <button
            className="invisible rounded-md border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-foreground group-hover:visible"
            title="Advance"
            onClick={(e) => {
              e.stopPropagation();
              void move({ id: investor._id, stage: next });
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {investor.checkSize && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          {investor.checkSize}
        </div>
      )}
      {lastNote && (
        <p className="mt-1.5 line-clamp-2 border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
          {lastNote.text}
        </p>
      )}
      <div className="mt-1 text-[10px] text-muted-foreground/70">
        touched {fmtDay(investor.lastTouchAt)}
      </div>
    </div>
  );
}

function Detail({
  investor,
  onClose,
}: {
  investor: Doc<"investors">;
  onClose: () => void;
}) {
  const addNote = useMutation(api.investors.addNote);
  const move = useMutation(api.investors.move);
  const remove = useMutation(api.investors.remove);
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">
              {investor.firm}
            </h2>
            <div className="text-sm text-muted-foreground">
              {investor.partner ?? "partner unknown"}
              {investor.checkSize ? ` · ${investor.checkSize}` : ""}
            </div>
            {investor.introPath && (
              <div className="mt-1 text-xs text-muted-foreground">
                Intro via {investor.introPath}
              </div>
            )}
          </div>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {investor.research && (
          <div className="border-b border-border p-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Research
            </div>
            <p className="text-sm text-muted-foreground">{investor.research}</p>
            {investor.researchSourceUrl && (
              <a
                href={investor.researchSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline underline-offset-2"
              >
                source
              </a>
            )}
          </div>
        )}

        <div className="border-b border-border p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Stage
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...STAGES.map((s) => s.id), "closed", "passed"].map((s) => (
              <button
                key={s}
                onClick={() =>
                  void move({ id: investor._id, stage: s as StageId })
                }
                className={`rounded-full border px-2.5 py-1 text-xs capitalize ${
                  investor.stage === s
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {investor.passReason && (
            <p className="mt-2 text-xs text-muted-foreground">
              Pass reason (verbatim): &ldquo;{investor.passReason}&rdquo;
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notes ({investor.notes.length})
          </div>
          <ol className="space-y-2">
            {[...investor.notes].reverse().map((n, i) => (
              <li key={i} className="rounded-lg bg-secondary/50 p-2.5">
                <div className="whitespace-pre-wrap text-sm">{n.text}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {fmtDay(n.at)}
                  {n.kind ? ` · ${n.kind}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && note.trim()) {
                  void addNote({ id: investor._id, text: note });
                  setNote("");
                }
              }}
            />
          </div>
          <button
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-red-400"
            onClick={() => {
              void remove({ id: investor._id });
              onClose();
            }}
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
