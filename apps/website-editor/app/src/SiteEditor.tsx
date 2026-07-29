import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

// The app never publishes or rolls back on its own — those are agent actions
// with a confirmation in chat. Buttons here tell you what to say.
export default function SiteEditor() {
  const config = useQuery(api.site.config);
  const versions = useQuery(api.site.versions);
  const live = useQuery(api.site.live);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const rows = versions ?? [];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="mr-auto">
          <h1 className="text-base font-semibold leading-tight">Site</h1>
          <p className="text-[11px] text-muted-foreground">
            {live ? `v${live.number} live` : "nothing published yet"}
            {config?.domain ? ` · ${config.domain}` : ""}
          </p>
        </div>

        {config && (
          <div className="flex items-center gap-2 text-[11px]">
            <StatusDot ok={config.dnsOk} label="DNS" />
            <StatusDot ok={config.certOk} label="SSL" />
          </div>
        )}

        <div className="flex rounded-full border border-border p-0.5 text-xs">
          <button
            onClick={() => setDevice("desktop")}
            className={`rounded-full px-2 py-1 ${device === "desktop" ? "bg-secondary" : "text-muted-foreground"}`}
            aria-label="Desktop preview"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`rounded-full px-2 py-1 ${device === "mobile" ? "bg-secondary" : "text-muted-foreground"}`}
            aria-label="Mobile preview"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* preview */}
        <div className="flex min-w-0 flex-1 items-start justify-center overflow-auto bg-secondary/30 p-4">
          {config?.previewUrl ? (
            <iframe
              src={config.previewUrl}
              title="Site preview"
              className="h-full rounded-lg border border-border bg-background shadow-sm"
              style={{ width: device === "mobile" ? 390 : "100%" }}
            />
          ) : (
            <p className="mt-16 max-w-sm text-center text-sm text-muted-foreground">
              No preview yet. Tell your agent what you want the site to say and
              it&apos;ll build one here — this pane is the real site, running on
              its computer, before anything goes public.
            </p>
          )}
        </div>

        {/* change log */}
        <div className="w-full max-w-xs shrink-0 overflow-y-auto border-l border-border p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Change log
          </div>
          {versions === undefined ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Every change your agent makes shows up here as a version you can
              publish or roll back to.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((v) => (
                <VersionRow key={v._id} version={v} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          ok === true
            ? "bg-emerald-400"
            : ok === false
              ? "bg-red-400"
              : "bg-muted-foreground/40"
        }`}
      />
      {label}
    </span>
  );
}

function VersionRow({ version }: { version: Doc<"site_versions"> }) {
  return (
    <li className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold tabular-nums">
          v{version.number}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs">
          {version.summary}
        </span>
        {version.status === "published" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
            <Check className="h-2.5 w-2.5" /> live
          </span>
        )}
        {version.status === "rolledBack" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <RotateCcw className="h-2.5 w-2.5" /> rolled back
          </span>
        )}
      </div>

      {version.screenshotPath && (
        <img
          src={version.screenshotPath}
          alt={`Screenshot of version ${version.number}`}
          className="mt-1.5 h-20 w-full rounded border border-border/60 object-cover object-top"
        />
      )}

      {version.plainDiff.length > 0 && (
        <ul className="mt-1.5 list-inside list-disc text-[11px] text-muted-foreground">
          {version.plainDiff.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}

      {version.restoredFrom !== undefined && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          restores v{version.restoredFrom}
        </p>
      )}

      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
        {version.status === "published"
          ? `published ${new Date(version.publishedAt ?? version.createdAt).toLocaleDateString()}`
          : `say “publish v${version.number}” or “roll back to v${version.number}” in chat`}
      </p>
    </li>
  );
}
