import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Check, MessageSquare, Star, X } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

const PLATFORMS = [
  { id: "all", label: "All" },
  { id: "google", label: "Google" },
  { id: "yelp", label: "Yelp" },
] as const;

// Sentiment tint: the card's left edge is the fastest read in the queue.
const tintFor = (stars: number) =>
  stars <= 2
    ? "border-l-red-400/70"
    : stars === 3
      ? "border-l-amber-400/70"
      : "border-l-emerald-400/70";

function Stars({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${n} stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= n
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

export default function ReviewQueue() {
  const [platform, setPlatform] =
    useState<(typeof PLATFORMS)[number]["id"]>("all");
  const reviews = useQuery(
    api.reviews.list,
    platform === "all" ? {} : { platform },
  );
  const trajectory = useQuery(api.reviews.trajectory) ?? [];

  const all = reviews ?? [];
  const pending = all.filter(
    (r) => r.status === "new" || r.status === "drafted",
  );
  const handled = all.filter(
    (r) => r.status === "posted" || r.status === "skipped",
  );
  const thisMonth = trajectory[trajectory.length - 1];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Reviews</h1>
            <p className="text-xs text-muted-foreground">
              {pending.length === 0
                ? "Nothing waiting on you"
                : `${pending.length} waiting on you`}
              {thisMonth
                ? ` · ${thisMonth.average}★ average this month (${thisMonth.count})`
                : ""}
            </p>
          </div>
          <div className="flex rounded-full border border-border p-0.5 text-xs">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`rounded-full px-3 py-1 ${
                  platform === p.id
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <p className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          Nothing is ever posted to a review site without your approval on this
          screen.
        </p>

        {reviews === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : all.length === 0 ? (
          <EmptyHero />
        ) : (
          <>
            {pending.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
            {handled.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Handled ({handled.length})
                </div>
                <div className="flex flex-col gap-1.5">
                  {handled.slice(0, 20).map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Stars n={r.stars} />
                      <span className="truncate">{r.author}</span>
                      <span className="ml-auto capitalize">{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Doc<"reviews"> }) {
  const editDraft = useMutation(api.reviews.editDraft);
  const setStatus = useMutation(api.reviews.setStatus);
  const [draft, setDraft] = useState(review.draft ?? "");
  const [editing, setEditing] = useState(false);
  const dirty = draft !== (review.draft ?? "");

  return (
    <div
      className={`rounded-lg border border-l-4 border-border bg-card p-3 ${tintFor(review.stars)}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Stars n={review.stars} />
        <span className="text-sm font-medium">{review.author}</span>
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
          {review.platform}
        </span>
        {review.likelyFiltered && (
          <span
            className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title="This review may be filtered / not recommended by the platform — replying may not be worth it"
          >
            likely filtered
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {new Date(review.postedAt).toLocaleDateString()}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm">{review.text}</p>

      {review.escalated && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-500/10 p-2 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Escalated for service recovery.
            {review.internalQuestion ? ` ${review.internalQuestion}` : ""}
          </span>
        </div>
      )}

      {review.replyAdvice && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{review.replyAdvice}</span>
        </div>
      )}

      {review.status === "new" ? (
        <p className="mt-2 text-xs text-muted-foreground/70">
          Reply not drafted yet — your agent will write one on its next pass.
        </p>
      ) : (
        <div className="mt-2">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:border-muted-foreground/50"
            />
          ) : (
            <div className="rounded-md bg-secondary/50 p-2 text-sm">
              {draft || review.draft}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                if (dirty) {
                  void editDraft({ id: review._id, draft });
                }
                void setStatus({ id: review._id, status: "approved" });
              }}
            >
              <Check className="mr-1 h-3 w-3" /> Approve — agent posts
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done editing" : "Edit"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() =>
                void setStatus({ id: review._id, status: "skipped" })
              }
            >
              <X className="mr-1 h-3 w-3" /> Skip
            </Button>
            {review.url && (
              <a
                href={review.url}
                target="_blank"
                rel="noreferrer"
                className="self-center text-[11px] underline underline-offset-2 text-muted-foreground hover:text-foreground"
              >
                open on {review.platform}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
      <Star className="h-7 w-7 text-muted-foreground/50" />
      <div className="text-sm font-medium">No reviews fetched yet</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Your agent checks daily and files each new review here with a reply
        already drafted in your voice. One-star reviews jump straight to chat
        with a service-recovery draft and a question about what happened.
      </p>
    </div>
  );
}
