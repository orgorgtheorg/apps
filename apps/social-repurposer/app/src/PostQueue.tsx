import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Image as ImageIcon, Send, Trash2 } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  gbp: "Google",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// This week's activity, so gaps are visible at a glance.
function WeekStrip({ posts }: { posts: Doc<"social_posts">[] }) {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const counts = DAYS.map((_, i) => {
    const start = monday.getTime() + i * 86_400_000;
    const end = start + 86_400_000;
    return posts.flatMap((p) =>
      p.variants.filter(
        (v) =>
          v.status === "posted" &&
          (v.postedAt ?? 0) >= start &&
          (v.postedAt ?? 0) < end,
      ),
    ).length;
  });

  return (
    <div className="flex items-end gap-1.5">
      {DAYS.map((day, i) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`h-8 w-full rounded ${
              counts[i] === 0
                ? "bg-secondary/60"
                : counts[i] === 1
                  ? "bg-primary/40"
                  : "bg-primary/80"
            }`}
            title={`${counts[i]} posted`}
          />
          <span className="text-[10px] text-muted-foreground">{day}</span>
        </div>
      ))}
    </div>
  );
}

export default function PostQueue() {
  const posts = useQuery(api.social.list);
  const all = posts ?? [];
  const pending = all.filter((p) =>
    p.variants.some((v) => v.status === "draft" || v.status === "approved"),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Post queue</h1>
          <p className="text-xs text-muted-foreground">
            {pending.length === 0
              ? "One input becomes a post for every platform"
              : `${pending.length} waiting on you`}
          </p>
        </div>

        {all.length > 0 && <WeekStrip posts={all} />}

        {posts === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : all.length === 0 ? (
          <EmptyHero />
        ) : (
          all.map((post) => <PostCard key={post._id} post={post} />)
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: Doc<"social_posts"> }) {
  const remove = useMutation(api.social.remove);
  const done = post.variants.every(
    (v) =>
      v.status === "posted" || v.status === "copied" || v.status === "skipped",
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        {post.imagePath && (
          <span
            className="mt-0.5 inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title={post.imagePath}
          >
            <ImageIcon className="h-3 w-3" /> photo
          </span>
        )}
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          <span className="text-foreground">Input:</span> {post.source}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        <button
          className="text-muted-foreground/50 hover:text-red-400"
          onClick={() => void remove({ id: post._id })}
          aria-label="Delete this input and its variants"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {post.variants.map((variant) => (
          <Variant key={variant.platform} postId={post._id} variant={variant} />
        ))}
      </div>

      {done && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          All variants handled — this input won&apos;t be posted again.
        </p>
      )}
    </div>
  );
}

function Variant({
  postId,
  variant,
}: {
  postId: Doc<"social_posts">["_id"];
  variant: Doc<"social_posts">["variants"][number];
}) {
  const edit = useMutation(api.social.editVariant);
  const [body, setBody] = useState(variant.body);
  const [copied, setCopied] = useState(false);
  const dirty = body !== variant.body;
  const settled =
    variant.status === "posted" ||
    variant.status === "copied" ||
    variant.status === "skipped";

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/70 bg-background p-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {PLATFORM_LABEL[variant.platform] ?? variant.platform}
        </span>
        <span
          className={`ml-auto text-[10px] capitalize ${
            variant.status === "posted"
              ? "text-emerald-400"
              : variant.status === "approved"
                ? "text-amber-400"
                : "text-muted-foreground"
          }`}
        >
          {variant.status}
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => {
          if (dirty) {
            void edit({ id: postId, platform: variant.platform, body });
          }
        }}
        rows={5}
        disabled={settled}
        className="w-full resize-none rounded border border-input bg-background p-1.5 text-xs outline-none focus:border-muted-foreground/50 disabled:opacity-60"
      />
      {variant.hashtags && (
        <div
          className="truncate text-[10px] text-muted-foreground"
          title={variant.hashtags}
        >
          {variant.hashtags}
        </div>
      )}

      {!settled && (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            className="h-6 flex-1 text-[11px]"
            onClick={() =>
              void edit({
                id: postId,
                platform: variant.platform,
                body,
                status: "approved",
              })
            }
          >
            <Send className="mr-1 h-3 w-3" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px]"
            onClick={() => {
              void navigator.clipboard.writeText(
                variant.hashtags ? `${body}\n\n${variant.hashtags}` : body,
              );
              setCopied(true);
              void edit({
                id: postId,
                platform: variant.platform,
                status: "copied",
              });
            }}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px]"
            onClick={() =>
              void edit({
                id: postId,
                platform: variant.platform,
                status: "skipped",
              })
            }
          >
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
      <div className="text-sm font-medium">Nothing queued</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Drop a photo or one sentence in the chat — &quot;new Saturday 7am
        class&quot; — and your agent writes an Instagram, Facebook, and Google
        version in your voice. Approve the ones you like and it posts them, or
        copy the text and post it yourself.
      </p>
    </div>
  );
}
