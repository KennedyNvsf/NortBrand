"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import type { TeamFilesCopy } from "../../copy";
import { finishUploadAction, prepareUploadAction } from "../actions";
import type { FileError } from "../files-edit";

/*
 * Upload files (#140; Figma TM-08 drop zone and "Upload file"). For each file: the server
 * signs an upload into this project's folder, the browser sends the bytes straight to
 * Storage (no 4.5 MB function limit), and the server then checks what the file really is
 * and how big it is before registering it, team-only. Refusals name the file and say why.
 * Files go one at a time, announced as they go.
 */

const INPUT_ID = "team-file-input";
const subscribeNothing = () => () => undefined;

export function UploadButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      onClick={() => {
        document.getElementById(INPUT_ID)?.click();
      }}
    >
      <Upload aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      {label}
    </Button>
  );
}

export function Uploader({
  copy,
  projectId,
}: {
  copy: TeamFilesCopy;
  projectId: string;
}) {
  const router = useRouter();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  // True once hydrated (false in the server render), so tests and automation wait until
  // uploads are wired up.
  const ready = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const message = (error: FileError, name: string) =>
    fill(copy.errors[error], { name });

  const uploadOne = async (file: File): Promise<void> => {
    setBusy(fill(copy.uploading, { name: file.name }));
    const prepared = await prepareUploadAction({
      projectId,
      name: file.name,
      size: file.size,
      contentType: file.type,
    });
    if (prepared.status !== "ready") {
      toast.error(message(prepared.error, file.name));
      return;
    }
    const sent = await fetch(prepared.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "content-type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
    }).catch(() => null);
    if (!sent?.ok) {
      toast.error(fill(copy.errors.uploadFailed, { name: file.name }));
      return;
    }
    const finished = await finishUploadAction({
      projectId,
      fileId: prepared.fileId,
      name: file.name,
    });
    if (finished.status === "saved") {
      toast.success(fill(copy.uploaded, { name: file.name }));
    } else {
      toast.error(message(finished.error, file.name));
    }
  };

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0 || busy) return;
    for (const file of Array.from(list)) {
      await uploadOne(file);
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        void upload(event.dataTransfer.files);
      }}
      data-uploader-ready={ready ? "" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-default px-md py-lg text-center transition-colors duration-(--duration-fast)",
        over && "border-text-primary bg-bg-primary",
      )}
    >
      <input
        ref={input}
        id={INPUT_ID}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,application/zip,.zip"
        aria-label={copy.chooseFiles}
        aria-describedby={hintId}
        className="sr-only"
        onChange={(event) => {
          void upload(event.target.files);
        }}
      />
      <p className="text-[14px] text-text-primary">
        <label
          htmlFor={INPUT_ID}
          className="cursor-pointer font-semibold underline-offset-2 hover:underline"
        >
          {copy.dropTitle}
        </label>{" "}
        <span id={hintId} className="text-text-muted">
          {copy.dropHint}
        </span>
      </p>
      <p aria-live="polite" className="min-h-5 text-[13px] text-text-muted">
        {busy ?? ""}
      </p>
    </div>
  );
}
