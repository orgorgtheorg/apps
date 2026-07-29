import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const STAGES = [
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
] as const;
const CLOSED_STAGES = ["hired", "rejected"] as const;
type Stage = (typeof STAGES)[number]["id"] | (typeof CLOSED_STAGES)[number];

function daysIdle(candidate: Doc<"candidates">): number {
  return Math.floor((Date.now() - candidate.lastTouchedAt) / 86_400_000);
}

export default function CandidateBoard() {
  const candidates = useQuery(api.candidates.list) ?? [];
  const create = useMutation(api.candidates.create);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const closed = candidates.filter((c) =>
    (CLOSED_STAGES as readonly string[]).includes(c.stage),
  );

  const handleAdd = async () => {
    if (!name.trim() || !role.trim() || adding) return;
    setAdding(true);
    try {
      await create({
        name,
        role,
        email: email.trim() || undefined,
        source: "manual",
      });
      setName("");
      setEmail("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end gap-2 pb-4">
          <h1 className="mr-auto text-xl font-semibold">Candidates</h1>
          <Input
            className="h-9 w-40"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            className="h-9 w-36"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            className="h-9 w-44"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            size="sm"
            className="h-9"
            disabled={!name.trim() || !role.trim() || adding}
            onClick={handleAdd}
          >
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => {
            const inStage = candidates.filter((c) => c.stage === stage.id);
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {inStage.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {inStage.map((c) => (
                    <CandidateCard key={c._id} candidate={c} />
                  ))}
                  {inStage.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      No one here
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-6">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowClosed((v) => !v)}
          >
            {showClosed ? "Hide" : "Show"} hired & rejected ({closed.length})
          </button>
          {showClosed ? (
            <div className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {closed.map((c) => (
                <CandidateCard key={c._id} candidate={c} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: Doc<"candidates"> }) {
  const move = useMutation(api.candidates.move);
  const addNote = useMutation(api.candidates.addNote);
  const remove = useMutation(api.candidates.remove);
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const idle = daysIdle(candidate);
  const stageIndex = STAGES.findIndex((s) => s.id === candidate.stage);
  const isClosed = stageIndex === -1;

  const moveTo = (stage: Stage) => void move({ id: candidate._id, stage });

  const handleAddNote = async () => {
    if (!noteText.trim() || saving) return;
    setSaving(true);
    try {
      await addNote({ id: candidate._id, text: noteText });
      setNoteText("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="truncate text-sm font-medium">{candidate.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {candidate.role}
            {candidate.source ? ` · ${candidate.source}` : ""}
          </div>
        </button>
        {isClosed ? (
          <Badge
            variant={candidate.stage === "hired" ? "success" : "secondary"}
          >
            {candidate.stage}
          </Badge>
        ) : idle >= 3 ? (
          <Badge variant="warning">{idle}d idle</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{idle}d</span>
        )}
      </div>

      {!isClosed ? (
        <div className="flex items-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Move to previous stage"
            disabled={stageIndex === 0}
            onClick={() => moveTo(STAGES[stageIndex - 1].id)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Move to next stage"
            disabled={stageIndex === STAGES.length - 1}
            onClick={() => moveTo(STAGES[stageIndex + 1].id)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-auto flex gap-1">
            {candidate.stage === "offer" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => moveTo("hired")}
              >
                Hired
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label="Reject candidate"
              onClick={() => moveTo("rejected")}
            >
              <X className="size-4" />
            </Button>
          </span>
        </div>
      ) : null}

      {open ? (
        <div className="mt-2 border-t border-border pt-2">
          {candidate.email ? (
            <div className="pb-2 font-mono text-xs text-muted-foreground">
              {candidate.email}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            {candidate.notes.length === 0 ? (
              <div className="text-xs text-muted-foreground">No notes yet</div>
            ) : (
              candidate.notes.map((note) => (
                <div key={note.at} className="text-xs">
                  <span className="text-muted-foreground">
                    {new Date(note.at).toLocaleDateString()} ·{" "}
                  </span>
                  {note.text}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 pt-2">
            <Input
              className="h-8 text-xs"
              placeholder="Add note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Save note"
              disabled={!noteText.trim() || saving}
              onClick={handleAddNote}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Delete candidate"
              onClick={() => void remove({ id: candidate._id })}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
