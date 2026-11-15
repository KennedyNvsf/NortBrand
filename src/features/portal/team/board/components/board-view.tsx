"use client";

import { MoreHorizontal } from "lucide-react";
import { LazyMotion, m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useOptimistic,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_STROKE } from "@/lib/icons";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { Avatar, StatusPill } from "../../../overview/components/status";
import type { PortalStage, TicketStatus } from "../../../overview/domain";
import { formatDay } from "../../../overview/format";
import { initials } from "../../../shell/initials";
import type { BoardCopy } from "../../copy";
import { moveTicketAction } from "../actions";
import {
  BOARD_COLUMNS,
  COLUMN_LIMIT,
  buildColumns,
  columnOf,
  type BoardColumn,
  type BoardFilters,
  type BoardTicket,
} from "../board";
import { StatusMenu } from "./status-menu";

/*
 * The team board (#137; Figma TM-02, TM-T02, TM-M02).
 *   ≥ 1024 px  four columns; drag a card with a mouse to change its status.
 *   768–1023   the same columns, scrolling sideways.
 *   < 768      one status at a time (?status=), and no drag: tap a card's status.
 * Every card also has a status menu (the keyboard and touch way to move it). A move
 * shows at once (optimistic) and is undone if the server refuses; either way it's
 * announced to screen readers. The open ticket and the filters are URL state.
 * Motion (14 Portal — Motion, "Board drag"): the dragged card lifts (1.02 + shadow,
 * 150 ms); neighbours make room with a layout spring (400/30). Reduced motion: no lift,
 * instant reorder (MotionConfig drops the layout transform).
 */

const loadLayoutFeatures = () =>
  import("@/components/motion/motion-features-max").then(
    (module) => module.default,
  );

const DRAG_QUERY = "(min-width: 64rem) and (pointer: fine)";

function subscribeDrag(onChange: () => void) {
  const query = window.matchMedia(DRAG_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

type Move = { id: string; status: TicketStatus };

export function BoardView({
  copy,
  projectId,
  tickets,
  stages,
  team,
  filters,
  basePath,
}: {
  copy: BoardCopy;
  projectId: string;
  tickets: BoardTicket[];
  stages: PortalStage[];
  team: { userId: string; name: string }[];
  filters: BoardFilters;
  basePath: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");
  const [expanded, setExpanded] = useState<
    Partial<Record<BoardColumn, boolean>>
  >({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<BoardColumn | null>(null);
  const canDrag = useSyncExternalStore(
    subscribeDrag,
    () => window.matchMedia(DRAG_QUERY).matches,
    () => false,
  );
  const [shown, applyMove] = useOptimistic(
    tickets,
    (state: BoardTicket[], move: Move) =>
      state.map((ticket) =>
        ticket.id === move.id ? { ...ticket, status: move.status } : ticket,
      ),
  );

  const query = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | null> = {
      stage: filters.stage,
      owner: filters.owner,
      status: filters.status === "todo" ? null : filters.status,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const text = params.toString();
    return text ? `${basePath}?${text}` : basePath;
  };

  const move = (ticket: BoardTicket, status: TicketStatus) => {
    if (ticket.status === status) return;
    const columnName = copy.statuses[status];
    startTransition(async () => {
      applyMove({ id: ticket.id, status });
      const result = await moveTicketAction({
        projectId,
        ticketId: ticket.id,
        status,
      });
      if (result.status === "moved") {
        setAnnouncement(
          fill(copy.moved, { title: ticket.title, column: columnName }),
        );
        router.refresh();
      } else {
        const message = fill(copy.moveFailed, { title: ticket.title });
        setAnnouncement(message);
        toast.error(message);
      }
    });
  };

  const columns = buildColumns(shown, filters);
  const ticketHref = (ticket: BoardTicket) =>
    query({ ticket: String(ticket.number) });

  const card = (ticket: BoardTicket, mobile: boolean) => (
    <article
      draggable={canDrag && !mobile}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", ticket.id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(ticket.id);
      }}
      onDragEnd={() => {
        setDragging(null);
        setDropTarget(null);
      }}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-md border border-border-default bg-bg-surface p-3.5 transition-[scale,box-shadow] duration-(--duration-fast) ease-standard",
        canDrag && !mobile && "cursor-grab",
        dragging === ticket.id && "shadow-card-hover motion-safe:scale-[1.02]",
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-[15px] leading-snug font-medium text-text-primary">
          {/* The whole card is clickable; the link is what keyboard and screen readers use. */}
          <Link
            href={ticketHref(ticket)}
            scroll={false}
            className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus-ring"
          >
            {ticket.title}
          </Link>
        </h3>
        {!mobile ? (
          <StatusMenu
            label={fill(copy.moveMenu, { title: ticket.title })}
            heading={copy.moveTo}
            current={ticket.status}
            statuses={copy.statuses}
            onMove={(status) => {
              move(ticket, status);
            }}
          >
            <button
              type="button"
              className="touch-target relative z-10 -mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-text-muted hover:bg-bg-primary hover:text-text-primary"
            >
              <MoreHorizontal
                aria-hidden
                strokeWidth={ICON_STROKE}
                className="size-4"
              />
            </button>
          </StatusMenu>
        ) : null}
      </div>
      {ticket.waitingOnClient || ticket.status === "blocked" ? (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-text-error">
          <span aria-hidden className="size-2 rounded-[2px] bg-current" />
          {ticket.waitingOnClient ? copy.waitingOnClient : copy.blocked}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-text-muted">
        {mobile ? (
          <StatusMenu
            label={fill(copy.moveMenu, { title: ticket.title })}
            heading={copy.moveTo}
            current={ticket.status}
            statuses={copy.statuses}
            onMove={(status) => {
              move(ticket, status);
            }}
          >
            <button type="button" className="relative z-10 min-h-11">
              <StatusPill
                status={ticket.status}
                label={copy.statuses[ticket.status]}
              />
            </button>
          </StatusMenu>
        ) : null}
        {ticket.ownerName ? (
          <span className="flex items-center gap-1.5">
            <Avatar
              initials={initials(ticket.ownerName)}
              className="size-6 text-[10px]"
            />
            <span className="sr-only">
              {fill(copy.owner_, { name: ticket.ownerName })}
            </span>
          </span>
        ) : (
          <span className="sr-only">{copy.noOwner}</span>
        )}
        {ticket.dueOn ? (
          <span>
            <span className="sr-only">{copy.due} </span>
            {formatDay(ticket.dueOn, "en")}
          </span>
        ) : null}
        {!ticket.clientVisible ? (
          <span className="ml-auto rounded-sm border border-border-default px-1.5 py-0.5 text-[12px] text-text-primary">
            {copy.teamOnly}
          </span>
        ) : null}
      </div>
    </article>
  );

  const list = (column: BoardColumn, items: BoardTicket[], mobile: boolean) => {
    const limit = mobile ? Infinity : COLUMN_LIMIT[column];
    const open = expanded[column] === true;
    const visible = open ? items : items.slice(0, limit);
    const hidden = items.length - visible.length;
    return (
      <>
        <LazyMotion features={loadLayoutFeatures} strict>
          <ul className="flex flex-col gap-2">
            {visible.map((ticket) => (
              <m.li
                key={ticket.id}
                layout="position"
                transition={{ layout: motionTokens.spring.portalTab }}
              >
                {card(ticket, mobile)}
              </m.li>
            ))}
          </ul>
        </LazyMotion>
        {items.length === 0 ? (
          <p className="px-1 py-2 text-[13px] text-text-muted">
            {copy.columnEmpty}
          </p>
        ) : null}
        {hidden > 0 ? (
          <button
            type="button"
            aria-label={fill(copy.showMore, {
              count: hidden,
              column: copy.columns[column],
            })}
            className="min-h-11 self-start px-1 text-[13px] text-text-muted hover:text-text-primary lg:min-h-8"
            onClick={() => {
              setExpanded((current) => ({ ...current, [column]: true }));
            }}
          >
            {fill(copy.more, { count: hidden })}
          </button>
        ) : open && items.length > limit ? (
          <button
            type="button"
            className="min-h-11 self-start px-1 text-[13px] text-text-muted hover:text-text-primary lg:min-h-8"
            onClick={() => {
              setExpanded((current) => ({ ...current, [column]: false }));
            }}
          >
            {copy.fewer}
          </button>
        ) : null}
      </>
    );
  };

  const counts = Object.fromEntries(
    columns.map(({ column, tickets: items }) => [column, items.length]),
  ) as Record<BoardColumn, number>;
  const mobileColumn = columns.find(({ column }) => column === filters.status);

  return (
    <div className="flex flex-col gap-md">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div
        role="group"
        aria-label={copy.filtersLabel}
        className="flex flex-wrap items-center gap-3"
      >
        <Select
          value={filters.stage ?? "all"}
          onValueChange={(value) => {
            router.replace(query({ stage: value === "all" ? null : value }), {
              scroll: false,
            });
          }}
        >
          <SelectTrigger
            aria-label={copy.stage}
            className="w-auto min-w-44 gap-2 lg:h-9 lg:text-[13px]"
          >
            <span className="text-text-muted">{copy.stage}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allStages}</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.owner ?? "all"}
          onValueChange={(value) => {
            router.replace(query({ owner: value === "all" ? null : value }), {
              scroll: false,
            });
          }}
        >
          <SelectTrigger
            aria-label={copy.owner}
            className="w-auto min-w-44 gap-2 lg:h-9 lg:text-[13px]"
          >
            <span className="text-text-muted">{copy.owner}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.everyone}</SelectItem>
            {team.map((person) => (
              <SelectItem key={person.userId} value={person.userId}>
                {person.name}
              </SelectItem>
            ))}
            <SelectItem value="none">{copy.unassigned}</SelectItem>
          </SelectContent>
        </Select>
        <p className="hidden text-[13px] text-text-muted lg:block">
          {copy.dragHint}
        </p>
      </div>

      {/* Tablet and desktop: columns. */}
      <div className="-mx-md hidden gap-4 overflow-x-auto px-md pb-2 md:flex lg:mx-0 lg:grid lg:grid-cols-[repeat(4,minmax(200px,1fr))] lg:px-0">
        {columns.map(({ column, tickets: items }) => (
          <section
            key={column}
            aria-labelledby={`column-${column}`}
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(column);
            }}
            onDragLeave={() => {
              setDropTarget((current) => (current === column ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              const ticket = shown.find((entry) => entry.id === id);
              setDragging(null);
              setDropTarget(null);
              if (ticket && columnOf(ticket.status) !== column)
                move(ticket, column);
            }}
            className={cn(
              "flex w-[272px] shrink-0 flex-col gap-2 rounded-lg bg-bg-primary p-2.5 transition-colors duration-(--duration-fast) lg:w-auto",
              dropTarget === column &&
                "outline-2 outline-offset-2 outline-border-strong outline-dashed",
            )}
          >
            <h2
              id={`column-${column}`}
              className="flex items-center justify-between px-1 pt-1 pb-1.5 text-[14px] font-semibold text-text-primary"
            >
              {copy.columns[column]}
              <span className="text-[13px] font-normal text-text-muted">
                {items.length}
              </span>
            </h2>
            {list(column, items, false)}
          </section>
        ))}
      </div>

      {/* Mobile: one status at a time. */}
      <div className="flex flex-col gap-3 md:hidden">
        <nav aria-label={copy.statusLabel}>
          <ul className="-mx-md flex gap-2 overflow-x-auto px-md">
            {BOARD_COLUMNS.map((column) => {
              const active = column === filters.status;
              return (
                <li key={column} className="shrink-0">
                  <Link
                    href={query({ status: column === "todo" ? null : column })}
                    replace
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[14px] whitespace-nowrap",
                      active
                        ? "border-text-primary bg-text-primary font-semibold text-text-on-accent"
                        : "border-border-default font-medium text-text-muted",
                    )}
                  >
                    {copy.columns[column]}
                    <span className="text-[13px] font-normal opacity-80">
                      {counts[column]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {mobileColumn ? (
          <section
            aria-label={copy.columns[mobileColumn.column]}
            className="flex flex-col gap-3"
          >
            {list(mobileColumn.column, mobileColumn.tickets, true)}
          </section>
        ) : null}
        <p className="text-[13px] text-text-muted">{copy.mobileHint}</p>
      </div>
    </div>
  );
}
