import { useQuery } from "convex/react";
import {
  CheckCircle2,
  CircleDot,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  XCircle,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

const COLUMNS = [
  { id: "queued", label: "Queued" },
  { id: "inProgress", label: "In progress" },
  { id: "review", label: "In review" },
  { id: "changesRequested", label: "Changes requested" },
] as const;

function CiChip({ work }: { work: Doc<"dev_work"> }) {
  if (work.ciState === undefined && work.testsPassing === undefined) {
    return null;
  }
  const passing =
    work.ciState === "passing" ||
    (work.ciState === undefined && work.testsPassing);
  const failing =
    work.ciState === "failing" ||
    (work.ciState === undefined && work.testsPassing === false);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${
        passing
          ? "bg-emerald-500/15 text-emerald-400"
          : failing
            ? "bg-red-500/15 text-red-400"
            : "bg-secondary text-muted-foreground"
      }`}
      title={work.testsCommand ?? "CI"}
    >
      {passing ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : failing ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <CircleDot className="h-3 w-3" />
      )}
      {work.ciState ?? (work.testsPassing ? "tests pass" : "tests fail")}
    </span>
  );
}

export default function DevConsole() {
  const config = useQuery(api.dev.config);
  const work = useQuery(api.dev.work);
  const waiting = useQuery(api.dev.waitingOnHuman) ?? [];

  const rows = work ?? [];
  const merged = rows.filter((w) => w.state === "merged");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Dev</h1>
          <p className="text-xs text-muted-foreground">
            {config
              ? `${config.repo} · ${config.defaultBranch}${config.testCommand ? ` · ${config.testCommand}` : ""}`
              : "Connect a repo and your agent starts taking issues"}
          </p>
        </div>

        {waiting.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Waiting on you —</span>
            {waiting.slice(0, 4).map((w) => (
              <a
                key={w.id}
                href={w.prUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {w.title} ({w.daysOpen}d)
              </a>
            ))}
          </div>
        )}

        {work === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <GitBranch className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-medium">No work yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Point your agent at an issue — &quot;take #142&quot; — and it
              branches, works, runs the tests, and opens a PR with an honest
              summary. It never force-pushes and never merges without you.
            </p>
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="grid min-w-[860px] grid-cols-4 gap-3">
              {COLUMNS.map((col) => (
                <div key={col.id} className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {col.label}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {rows.filter((w) => w.state === col.id).length}
                    </span>
                  </div>
                  {rows
                    .filter((w) => w.state === col.id)
                    .map((w) => (
                      <WorkCard key={w._id} work={w} />
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {merged.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Merged ({merged.length})
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {merged.slice(0, 15).map((w) => (
                <li key={w._id} className="flex gap-2">
                  <span className="truncate">{w.title}</span>
                  {w.prUrl && (
                    <a
                      href={w.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto underline underline-offset-2 hover:text-foreground"
                    >
                      #{w.prNumber}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkCard({ work }: { work: Doc<"dev_work"> }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5">
      <div className="text-sm font-medium leading-snug">{work.title}</div>

      {work.summary && (
        <p className="line-clamp-3 text-xs text-muted-foreground">
          {work.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <CiChip work={work} />
        {work.branch && (
          <span className="inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground">
            <GitBranch className="h-3 w-3" /> {work.branch}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {work.issueUrl && (
          <a
            href={work.issueUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            #{work.issueNumber}
          </a>
        )}
        {work.prUrl && (
          <a
            href={work.prUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            <GitPullRequest className="h-3 w-3" /> PR #{work.prNumber}
          </a>
        )}
        {work.previewUrl && (
          <a
            href={work.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> preview
          </a>
        )}
      </div>
    </div>
  );
}
