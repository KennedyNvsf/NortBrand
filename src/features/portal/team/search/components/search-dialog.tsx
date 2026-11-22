"use client";

import { FolderKanban, Search, SquareCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import type { TeamSearchCopy } from "../../copy";
import { searchAction, type SearchResult } from "../actions";
import type { SearchHit } from "../search";

/*
 * The search dialog (#142; TM-09 "Search · no results"). Results come from the server
 * under the teammate's own session (RLS), 250 ms after typing stops; only the latest
 * answer is shown. Enter opens the first result; Tab moves through them. A bottom sheet
 * on phones, like every portal modal.
 */

const DEBOUNCE_MS = 250;

export function SearchDialog({
  copy,
  open,
  onOpenChange,
}: {
  copy: TeamSearchCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const ids = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const ticket = ++latest.current;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchAction(term).then((answer) => {
        if (ticket !== latest.current) return;
        setResult(answer);
        setSearching(false);
      });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const term = query.trim();
  const hits = term.length >= 2 && result?.status === "ok" ? result.hits : [];
  const projects = hits.filter((hit) => hit.kind === "project");
  const tickets = hits.filter((hit) => hit.kind === "ticket");

  const close = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] translate-y-0 gap-0 p-0 max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-h-[85dvh] max-md:max-w-full max-md:translate-x-0 max-md:rounded-b-none md:max-w-[560px] lg:max-w-[560px]"
      >
        <DialogTitle className="sr-only">{copy.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {copy.description}
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-border-default px-md">
          <Search
            aria-hidden
            strokeWidth={ICON_STROKE}
            className="size-4 shrink-0 text-text-muted"
          />
          <label htmlFor={`${ids}-q`} className="sr-only">
            {copy.field}
          </label>
          <input
            id={`${ids}-q`}
            type="search"
            autoComplete="off"
            maxLength={80}
            value={query}
            placeholder={copy.field}
            aria-describedby={`${ids}-status`}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              const first = projects[0] ?? tickets[0];
              if (event.key === "Enter" && first) {
                event.preventDefault();
                close();
                router.push(first.href);
              }
            }}
            className="h-14 w-full min-w-0 appearance-none bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            type="button"
            onClick={close}
            className="touch-target shrink-0 rounded-sm border border-border-default px-1.5 py-0.5 text-[12px] text-text-muted"
          >
            <span aria-hidden>Esc</span>
            <span className="sr-only">{copy.close}</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-md max-md:max-h-[65dvh]">
          <p id={`${ids}-status`} aria-live="polite" className="sr-only">
            {term.length < 2
              ? copy.hint
              : searching
                ? copy.searching
                : fill(copy.resultsCount, { count: hits.length })}
          </p>
          {term.length < 2 ? (
            <p className="text-[14px] text-text-muted">{copy.noResultsBody}</p>
          ) : result?.status === "failed" ? (
            <p role="alert" className="text-[14px] text-text-error">
              {copy.failed}
            </p>
          ) : result?.status === "ok" && hits.length === 0 && !searching ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-h4 text-text-primary">
                {fill(copy.noResultsTitle, { query: term })}
              </h2>
              <p className="text-body text-text-muted">{copy.noResultsBody}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              <ResultGroup
                heading={copy.projects}
                hits={projects}
                onPick={close}
              />
              <ResultGroup
                heading={copy.tickets}
                hits={tickets}
                onPick={close}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({
  heading,
  hits,
  onPick,
}: {
  heading: string;
  hits: SearchHit[];
  onPick: () => void;
}) {
  if (hits.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-2 text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
        {heading}
      </h2>
      <ul className="flex flex-col">
        {hits.map((hit) => (
          <li key={hit.href}>
            <Link
              href={hit.href}
              onClick={onPick}
              className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 hover:bg-bg-primary focus-visible:bg-bg-primary"
            >
              {hit.kind === "project" ? (
                <FolderKanban
                  aria-hidden
                  strokeWidth={ICON_STROKE}
                  className="size-4 shrink-0 text-text-muted"
                />
              ) : (
                <SquareCheck
                  aria-hidden
                  strokeWidth={ICON_STROKE}
                  className="size-4 shrink-0 text-text-muted"
                />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-medium text-text-primary">
                  {hit.kind === "project" ? hit.name : hit.title}
                </span>
                <span className="truncate text-[12px] text-text-muted">
                  {hit.kind === "project"
                    ? `${hit.clientName} · ${hit.publicId}`
                    : `${hit.projectName} · ${hit.publicId}-${String(hit.number)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
