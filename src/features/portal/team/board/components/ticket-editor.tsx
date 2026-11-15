"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import type { PortalStage, TicketStatus } from "../../../overview/domain";
import { TICKET_STATUSES } from "../../../overview/domain";
import { formatDay } from "../../../overview/format";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import { EditConflictNotice, SaveFailedNotice } from "../../../states/notices";
import type { BoardCopy, TicketEditorCopy } from "../../copy";
import { deleteTicketAction, saveTicketAction } from "../actions";
import {
  describeConflict,
  type EditableTicket,
  type TicketChange,
} from "../conflict";
import type { TicketFieldErrors } from "../ticket";

/*
 * The ticket editor (#137; Figma TM-02 panel, TM-T02 sheet, TM-M03 full screen).
 *   ≥ 1024 px  a column beside the board
 *   768–1023   a 440 px sheet from the right
 *   < 768      full screen, with Cancel / Save in its top bar
 * The URL holds the open ticket (?ticket=18, or ?ticket=new); closing drops it.
 *
 * Saves send the version this editor loaded. If someone saved since, nothing is
 * overwritten: the notice names who changed what (conflict.ts), the form keeps this
 * person's values, and they choose: "See their change" loads the saved ticket, "Keep
 * mine" saves theirs over the new version. A failed save keeps everything typed, and
 * Retry repeats it. Delete is guarded and says what the client loses.
 * Before hydration the column is assumed (server snapshot); it's display:none below
 * 1024 px, so a phone never sees it flash before the full-screen editor.
 * Motion (14 Portal — Motion): the column slides 24 px in with a fade (250 ms); sheets
 * slide from their edge; reduced motion keeps the fade.
 */

const WIDE = "(min-width: 64rem)";
const MOBILE = "(max-width: 47.9375rem)";

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(WIDE), window.matchMedia(MOBILE)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function layout(): "column" | "side" | "full" {
  if (window.matchMedia(WIDE).matches) return "column";
  return window.matchMedia(MOBILE).matches ? "full" : "side";
}

type Notice =
  | {
      kind: "conflict";
      current: EditableTicket;
      changedBy: string | null;
      changes: TicketChange[];
    }
  | { kind: "failed" }
  | { kind: "error"; message: string }
  | null;

export function TicketEditor({
  copy,
  statuses,
  initial,
  projectId,
  eyebrow,
  clientName,
  stages,
  team,
  closeHref,
}: {
  copy: TicketEditorCopy;
  statuses: BoardCopy["statuses"];
  initial: EditableTicket;
  projectId: string;
  eyebrow: string;
  clientName: string;
  stages: PortalStage[];
  team: { userId: string; name: string }[];
  closeHref: string;
}) {
  const router = useRouter();
  const ids = useId();
  const mode = useSyncExternalStore(subscribe, layout, () => "column" as const);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [loaded, setLoaded] = useState(initial);
  const [form, setForm] = useState(initial);
  const [newItem, setNewItem] = useState<string | null>(null);
  const [errors, setErrors] = useState<TicketFieldErrors>({});
  const [notice, setNotice] = useState<Notice>(null);

  const isNew = initial.id === null;
  const title = isNew ? copy.newTitle : loaded.title;
  const done = form.checklist.filter((item) => item.done).length;

  const close = () => {
    router.replace(closeHref, { scroll: false });
  };

  const set = <K extends keyof EditableTicket>(
    key: K,
    value: EditableTicket[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const valueName = (change: TicketChange): string => {
    switch (change.field) {
      case "title":
        return fill(copy.changes.title, { value: change.value ?? "" });
      case "status": {
        const status = TICKET_STATUSES.find((item) => item === change.value);
        return fill(copy.changes.status, {
          value: status ? statuses[status] : "",
        });
      }
      case "dueOn":
        return change.value
          ? fill(copy.changes.dueOn, { value: formatDay(change.value, "en") })
          : copy.changes.dueCleared;
      case "stageId":
        return fill(copy.changes.stageId, {
          value: stages.find((stage) => stage.id === change.value)?.name ?? "",
        });
      case "ownerId":
        return change.value
          ? fill(copy.changes.ownerId, {
              value:
                team.find((person) => person.userId === change.value)?.name ??
                "",
            })
          : copy.changes.ownerCleared;
      case "clientVisible":
        return fill(copy.changes.clientVisible, {
          value: change.value === "on" ? copy.visibilityOn : copy.visibilityOff,
        });
      default:
        return copy.changes[change.field];
    }
  };

  const conflictMessage = (current: Extract<Notice, { kind: "conflict" }>) => {
    const name = current.changedBy ?? copy.conflictSomeone;
    if (current.changes.length === 0)
      return fill(copy.conflictNothing, { name });
    const parts = current.changes.map(valueName);
    if (parts.length === 1)
      return fill(copy.conflictOne, { name, change: parts[0] ?? "" });
    const last = parts.pop() ?? "";
    return fill(copy.conflictMany, {
      name,
      changes: `${parts.join(", ")} and ${last}`,
    });
  };

  const save = (version: string | null) => {
    setNotice(null);
    startTransition(async () => {
      const result = await saveTicketAction({
        projectId,
        ticketId: form.id,
        version,
        title: form.title,
        description: form.description,
        status: form.status,
        stageId: form.stageId,
        ownerId: form.ownerId,
        dueOn: form.dueOn || null,
        clientVisible: form.clientVisible,
        checklist: form.checklist,
      });
      switch (result.status) {
        case "saved":
          toast.success(
            fill(isNew ? copy.created : copy.saved, {
              title: form.title.trim(),
            }),
          );
          close();
          router.refresh();
          return;
        case "conflict":
          setNotice({
            kind: "conflict",
            current: result.current,
            changedBy: result.changedBy,
            changes: describeConflict(loaded, result.current),
          });
          return;
        case "invalid":
          setErrors(result.fieldErrors);
          return;
        case "forbidden":
          setNotice({ kind: "error", message: copy.forbidden });
          return;
        case "not_found":
          setNotice({ kind: "error", message: copy.notFound });
          return;
        default:
          setNotice({ kind: "failed" });
      }
    });
  };

  const submit = () => {
    const local: TicketFieldErrors = {};
    if (!form.title.trim()) local.title = "titleInvalid";
    if (form.checklist.some((item) => !item.label.trim()))
      local.checklist = "checklistInvalid";
    setErrors(local);
    if (Object.keys(local).length === 0) save(loaded.version);
  };

  const remove = () => {
    if (!form.id) return;
    const ticketId = form.id;
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteTicketAction({ projectId, ticketId });
      setDeleting(false);
      setConfirmDelete(false);
      if (result.status === "deleted" || result.status === "not_found") {
        toast.success(fill(copy.deleted, { title: loaded.title }));
        close();
        router.refresh();
      } else {
        setNotice(
          result.status === "forbidden"
            ? { kind: "error", message: copy.forbidden }
            : { kind: "failed" },
        );
      }
    });
  };

  const fieldId = (field: string) => `${ids}-${field}`;
  const error = (field: keyof TicketFieldErrors) =>
    errors[field] ? (
      <FieldError id={fieldId(`${field}-error`)}>
        {copy.errors[errors[field]]}
      </FieldError>
    ) : null;

  const fields = (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-sm">
        <Label htmlFor={fieldId("title")}>{copy.title}</Label>
        <Input
          id={fieldId("title")}
          value={form.title}
          maxLength={160}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? fieldId("title-error") : undefined}
          onChange={(event) => {
            set("title", event.target.value);
          }}
        />
        {error("title")}
      </div>
      <div className="grid gap-[18px] md:grid-cols-2 md:gap-3">
        <div className="flex flex-col gap-sm">
          <Label id={fieldId("status-label")}>{copy.status}</Label>
          <Select
            value={form.status}
            onValueChange={(value) => {
              const next = TICKET_STATUSES.find((status) => status === value);
              if (next) set("status", next);
            }}
          >
            <SelectTrigger aria-labelledby={fieldId("status-label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((status: TicketStatus) => (
                <SelectItem key={status} value={status}>
                  {statuses[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-sm">
          <Label htmlFor={fieldId("due")}>{copy.due}</Label>
          <Input
            id={fieldId("due")}
            type="date"
            value={form.dueOn ?? ""}
            aria-invalid={errors.dueOn ? true : undefined}
            onChange={(event) => {
              set("dueOn", event.target.value || null);
            }}
          />
          {error("dueOn")}
        </div>
        <div className="flex flex-col gap-sm">
          <Label id={fieldId("stage-label")}>{copy.stage}</Label>
          <Select
            value={form.stageId}
            onValueChange={(value) => {
              set("stageId", value);
            }}
          >
            <SelectTrigger
              aria-labelledby={fieldId("stage-label")}
              aria-invalid={errors.stageId ? true : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error("stageId")}
        </div>
        <div className="flex flex-col gap-sm">
          <Label id={fieldId("owner-label")}>{copy.owner}</Label>
          <Select
            value={form.ownerId ?? "none"}
            onValueChange={(value) => {
              set("ownerId", value === "none" ? null : value);
            }}
          >
            <SelectTrigger
              aria-labelledby={fieldId("owner-label")}
              aria-invalid={errors.ownerId ? true : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{copy.noOwner}</SelectItem>
              {team.map((person) => (
                <SelectItem key={person.userId} value={person.userId}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error("ownerId")}
        </div>
      </div>
      <div className="flex flex-col gap-sm">
        <Label htmlFor={fieldId("description")}>{copy.description}</Label>
        <Textarea
          id={fieldId("description")}
          value={form.description}
          maxLength={5000}
          rows={5}
          aria-invalid={errors.description ? true : undefined}
          onChange={(event) => {
            set("description", event.target.value);
          }}
        />
        {error("description")}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 flex w-full items-baseline justify-between text-label text-text-primary">
          {copy.checklist}
          <span className="text-[13px] font-normal text-text-muted">
            {fill(copy.checklistCount, { done, total: form.checklist.length })}
          </span>
        </legend>
        <ul className="flex flex-col">
          {form.checklist.map((item, index) => (
            <li
              key={item.id ?? `new-${String(index)}`}
              className="group flex min-h-11 items-center gap-2.5 lg:min-h-8"
            >
              <input
                id={fieldId(`item-${String(index)}`)}
                type="checkbox"
                checked={item.done}
                className="size-5 shrink-0 accent-action-secondary"
                onChange={(event) => {
                  set(
                    "checklist",
                    form.checklist.map((entry, position) =>
                      position === index
                        ? { ...entry, done: event.target.checked }
                        : entry,
                    ),
                  );
                }}
              />
              <label
                htmlFor={fieldId(`item-${String(index)}`)}
                className="min-w-0 flex-1 text-[15px] text-text-primary"
              >
                {item.label}
              </label>
              <button
                type="button"
                aria-label={fill(copy.removeItem, { label: item.label })}
                className="touch-target grid size-6 place-items-center rounded-full text-text-muted hover:text-text-primary lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
                onClick={() => {
                  set(
                    "checklist",
                    form.checklist.filter((_, position) => position !== index),
                  );
                }}
              >
                <X aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {newItem !== null ? (
          <Input
            aria-label={copy.newItem}
            autoFocus
            value={newItem}
            maxLength={200}
            onChange={(event) => {
              setNewItem(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const label = newItem.trim();
                if (label)
                  set("checklist", [...form.checklist, { label, done: false }]);
                setNewItem("");
              } else if (event.key === "Escape") {
                event.stopPropagation();
                setNewItem(null);
              }
            }}
            onBlur={() => {
              const label = newItem.trim();
              if (label)
                set("checklist", [...form.checklist, { label, done: false }]);
              setNewItem(null);
            }}
          />
        ) : (
          <button
            type="button"
            className="min-h-11 self-start text-[14px] font-medium text-text-accent lg:min-h-8"
            onClick={() => {
              setNewItem("");
            }}
          >
            {copy.addItem}
          </button>
        )}
        {error("checklist")}
      </fieldset>

      <div className="flex items-start gap-3 rounded-lg border border-border-default bg-bg-primary p-md">
        <Switch
          id={fieldId("visible")}
          checked={form.clientVisible}
          onCheckedChange={(checked) => {
            set("clientVisible", checked);
          }}
          aria-describedby={fieldId("visible-hint")}
          className="touch-target"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor={fieldId("visible")}>{copy.visible}</Label>
          <p
            id={fieldId("visible-hint")}
            className="text-[13px] leading-[1.45] text-text-muted"
          >
            {fill(copy.visibleHint, { client: clientName })}
          </p>
        </div>
      </div>

      <div aria-live="polite">
        {notice?.kind === "conflict" ? (
          <EditConflictNotice
            message={conflictMessage(notice)}
            seeTheirsLabel={copy.seeTheirs}
            keepMineLabel={copy.keepMine}
            onSeeTheirs={() => {
              setLoaded(notice.current);
              setForm(notice.current);
              setNotice(null);
            }}
            onKeepMine={() => {
              setLoaded(notice.current);
              save(notice.current.version);
            }}
          />
        ) : notice?.kind === "failed" ? (
          <SaveFailedNotice
            message={copy.saveFailed}
            retryLabel={copy.retry}
            cancelLabel={copy.cancel}
            onRetry={submit}
            onCancel={close}
            retrying={pending}
          />
        ) : notice?.kind === "error" ? (
          <FieldError>{notice.message}</FieldError>
        ) : null}
      </div>
    </div>
  );

  const deleteDialog = form.id ? (
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={fill(copy.deleteTitle, { title: loaded.title })}
      body={
        loaded.clientVisible
          ? fill(copy.deleteVisible, { client: clientName })
          : copy.deleteHidden
      }
      confirmLabel={copy.deleteConfirm}
      cancelLabel={copy.cancel}
      onConfirm={remove}
      pending={deleting}
    />
  ) : null;

  const deleteButton = !isNew ? (
    <button
      type="button"
      className="min-h-11 text-[14px] font-medium text-text-accent lg:min-h-9"
      onClick={() => {
        setConfirmDelete(true);
      }}
    >
      {copy.delete}
    </button>
  ) : null;

  const footer = (
    <footer className="flex items-center gap-3 border-t border-border-default px-lg py-md">
      {deleteButton}
      <span className="flex-1" />
      <Button type="button" variant="ghost" onClick={close} disabled={pending}>
        {copy.cancel}
      </Button>
      <Button type="button" onClick={submit} loading={pending}>
        {pending ? copy.saving : isNew ? copy.create : copy.save}
      </Button>
    </footer>
  );

  const head = (
    <header className="flex items-start gap-3 border-b border-border-default px-lg pt-5 pb-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {eyebrow}
        </p>
        <Heading
          mode={mode}
          className="text-[20px] leading-tight font-bold text-text-primary"
        >
          {title}
        </Heading>
      </div>
      <button
        type="button"
        aria-label={copy.close}
        onClick={close}
        className="touch-target grid size-[34px] shrink-0 place-items-center rounded-full border border-border-default text-text-primary hover:border-border-strong"
      >
        <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      </button>
    </header>
  );

  if (mode === "column") {
    return (
      <aside
        aria-label={title}
        className="hidden h-full max-h-[calc(100dvh-4rem)] flex-col border-l border-border-default bg-bg-surface motion-safe:animate-in motion-safe:duration-(--duration-base) motion-safe:fade-in-0 motion-safe:slide-in-from-right-6 lg:sticky lg:top-16 lg:flex"
      >
        {head}
        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-5">
          {fields}
        </div>
        {footer}
        {deleteDialog}
      </aside>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        side="right"
        aria-describedby={undefined}
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          // Esc while adding a checklist item cancels the item, not the whole editor.
          if (newItem !== null) {
            event.preventDefault();
            setNewItem(null);
          }
        }}
        className={
          mode === "full"
            ? "flex w-full max-w-full flex-col gap-0 p-0"
            : "flex w-full flex-col gap-0 p-0 md:max-w-[440px]"
        }
      >
        {mode === "full" ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border-default px-md py-2">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={pending}
              >
                {copy.cancel}
              </Button>
              <SheetTitle className="text-[16px] font-semibold text-text-primary">
                {isNew ? copy.mobileNewTitle : copy.mobileEditTitle}
              </SheetTitle>
              <Button
                type="button"
                variant="ghost"
                onClick={submit}
                loading={pending}
                className="text-text-accent"
              >
                {copy.mobileSave}
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-md py-md">
              <p className="mb-md text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
                {eyebrow}
              </p>
              {fields}
              {deleteButton ? (
                <div className="mt-lg flex justify-center">{deleteButton}</div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {head}
            <div className="min-h-0 flex-1 overflow-y-auto px-lg py-5">
              {fields}
            </div>
            {footer}
          </>
        )}
        {deleteDialog}
      </SheetContent>
    </Sheet>
  );
}

/** In a sheet the title must be the dialog's own title; in the column it's an h2. */
function Heading({
  mode,
  className,
  children,
}: {
  mode: "column" | "side" | "full";
  className: string;
  children: ReactNode;
}) {
  return mode === "column" ? (
    <h2 className={className}>{children}</h2>
  ) : (
    <SheetTitle className={className}>{children}</SheetTitle>
  );
}
