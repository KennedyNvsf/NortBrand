"use client";

import Link from "next/link";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/content/site";

import { fill } from "../../auth/components/copy";
import { ConfirmDialog } from "../../states/confirm-dialog";
import { EmptyState } from "../../states/empty-state";
import { NoResults, ReadOnlyNotice } from "../../states/messages";
import { EditConflictNotice, SaveFailedNotice } from "../../states/notices";
import { Bone, Delayed } from "../../states/skeletons";
import { teamStatesCopy } from "../copy";

/*
 * The states page (#133): Figma CP-08 (527:289) and TM-09 (547:612) as live components.
 * Interactions are local (nothing is saved): Retry "succeeds" on the second try, the
 * conflict choice and the delete confirm toast, search never finds anything.
 */

const copy = teamStatesCopy;

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label text-text-primary">{label}</h2>
      <div className="flex flex-col gap-md rounded-lg border border-border-default p-lg">
        {children}
      </div>
    </section>
  );
}

function SaveFailedDemo() {
  const id = useId();
  const [value, setValue] = useState<string>(copy.saveFailed.value);
  const [failed, setFailed] = useState(true);
  const [retrying, startRetry] = useTransition();
  return (
    <Card label={copy.saveFailed.label}>
      <div className="flex flex-col gap-sm">
        <Label htmlFor={`${id}-title`}>{copy.saveFailed.field}</Label>
        <Input
          id={`${id}-title`}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </div>
      {failed ? (
        <SaveFailedNotice
          message={copy.saveFailed.message}
          retryLabel={copy.saveFailed.retry}
          cancelLabel={copy.saveFailed.cancel}
          retrying={retrying}
          onCancel={() => {
            setFailed(false);
          }}
          onRetry={() => {
            startRetry(async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
              setFailed(false);
              toast.success(copy.saveFailed.saved);
            });
          }}
        />
      ) : null}
    </Card>
  );
}

function ConflictDemo() {
  const [open, setOpen] = useState(true);
  return (
    <Card label={copy.conflict.label}>
      {open ? (
        <EditConflictNotice
          message={copy.conflict.message}
          seeTheirsLabel={copy.conflict.seeTheirs}
          keepMineLabel={copy.conflict.keepMine}
          onSeeTheirs={() => {
            setOpen(false);
            toast(copy.conflict.showingTheirs);
          }}
          onKeepMine={() => {
            setOpen(false);
            toast.success(copy.conflict.keptMine);
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(true);
          }}
        >
          {copy.conflict.label}
        </Button>
      )}
    </Card>
  );
}

function DeleteDemo() {
  const [open, setOpen] = useState(false);
  const [pending, startDelete] = useTransition();
  return (
    <Card label={copy.remove.label}>
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(true);
          }}
        >
          {copy.remove.open}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.remove.title}
        body={copy.remove.body}
        confirmLabel={copy.remove.confirm}
        cancelLabel={copy.remove.cancel}
        pending={pending}
        onConfirm={() => {
          startDelete(async () => {
            await new Promise((resolve) => setTimeout(resolve, 400));
            setOpen(false);
            toast.success(copy.remove.deleted);
          });
        }}
      />
    </Card>
  );
}

function SearchDemo() {
  const id = useId();
  const [query, setQuery] = useState("cuya");
  return (
    <Card label={copy.search.label}>
      <div className="flex flex-col gap-sm">
        <Label htmlFor={`${id}-search`}>{copy.search.field}</Label>
        <Input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      {query.trim() ? (
        <NoResults
          title={fill(copy.search.title, { query: query.trim() })}
          body={copy.search.body}
        />
      ) : null}
    </Card>
  );
}

export function StatesGallery() {
  return (
    <div className="xl:grid-cols-3 grid gap-xl md:grid-cols-2">
      <Card label={copy.loading.label}>
        <Delayed label={copy.loading.label} className="flex flex-col gap-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-6 w-3/4" />
          <Bone className="h-3 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Bone className="h-12" />
            <Bone className="h-12" />
            <Bone className="h-12" />
          </div>
        </Delayed>
        <p className="text-small text-text-muted">{copy.loading.note}</p>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-text-primary">{copy.empty.label}</h2>
        <EmptyState
          mark
          title={copy.empty.title}
          body={copy.empty.body}
          action={
            <Button asChild variant="secondary" showIcon>
              <a href={`mailto:${site.contact.email.value}`}>
                {copy.empty.action}
              </a>
            </Button>
          }
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-text-primary">{copy.firstRun.label}</h2>
        <EmptyState
          title={copy.firstRun.title}
          body={copy.firstRun.body}
          action={
            <Button type="button" disabled>
              {copy.firstRun.action}
            </Button>
          }
        />
      </section>
      <SaveFailedDemo />
      <ConflictDemo />
      <DeleteDemo />
      <SearchDemo />
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-text-primary">{copy.readOnly.label}</h2>
        <ReadOnlyNotice
          title={copy.readOnly.title}
          body={copy.readOnly.body}
          action={
            <Button asChild variant="secondary">
              <Link href="/team">{copy.readOnly.action}</Link>
            </Button>
          }
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-text-primary">{copy.signedOut.label}</h2>
        <ReadOnlyNotice
          title={copy.signedOut.title}
          body={copy.signedOut.body}
          action={
            <Button asChild showIcon>
              <Link href="/team/sign-in?reason=signed-out">
                {copy.signedOut.action}
              </Link>
            </Button>
          }
        />
      </section>
    </div>
  );
}
