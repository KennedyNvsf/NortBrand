import { E2E_PROJECT_VIEW } from "../../overview/e2e-fixture";
import type { AllowedType } from "./magic";
import { SNIFF_BYTES } from "./magic";

/**
 * A fake file store for Playwright (#140), used only when isFakeBackendEnabled(). Seeded
 * from the client portal's fixture files (shared) plus one team-only file. "Uploads" go to
 * /api/portal/files/fake-upload (404 outside the fake backend) and keep only each
 * object's first bytes and size, which is all the server-side check reads. The rules in
 * files-edit.ts and magic.ts run for real. One store per server process (on globalThis, see below).
 */

export type FakeFile = {
  id: string;
  projectId: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  shared: boolean;
  uploaderName: string | null;
  createdAt: string;
};

const PROJECT_ID = "00000000-0000-4000-b000-00000000e2e0";

const seed = (): FakeFile[] => [
  ...E2E_PROJECT_VIEW.files.map((file) => ({
    id: file.id,
    projectId: PROJECT_ID,
    name: file.name,
    sizeBytes: file.sizeBytes,
    contentType: file.contentType,
    shared: true,
    uploaderName: file.uploaderName,
    createdAt: file.createdAt,
  })),
  {
    id: "00000000-0000-4000-a000-00000000f2ff",
    projectId: PROJECT_ID,
    name: "Internal estimate",
    sizeBytes: 64_000,
    contentType: "application/pdf",
    shared: false,
    uploaderName: "Ana Costa",
    createdAt: "2026-09-23T10:00:00Z",
  },
];

/*
 * Next loads route handlers and page actions as separate module instances, so the fake
 * upload route and the actions would each get their own copy of a module-level store.
 * Keeping it on globalThis gives the one server process a single store.
 */
type Store = {
  files: FakeFile[];
  objects: Map<string, { head: Uint8Array; size: number }>;
};
const holder = globalThis as typeof globalThis & { __nbFakeTeamFiles?: Store };
holder.__nbFakeTeamFiles ??= { files: seed(), objects: new Map() };
const { files, objects } = holder.__nbFakeTeamFiles;

export function fakeTeamFiles(projectId: string): FakeFile[] {
  return files
    .filter((file) => file.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function fakeFindFile(id: string): FakeFile | null {
  return files.find((file) => file.id === id) ?? null;
}

export function fakeSignUpload(path: string): { uploadUrl: string } {
  return {
    uploadUrl: `/api/portal/files/fake-upload?path=${encodeURIComponent(path)}`,
  };
}

export function fakeStoreObject(path: string, bytes: Uint8Array) {
  objects.set(path, {
    head: bytes.slice(0, SNIFF_BYTES),
    size: bytes.byteLength,
  });
}

export function fakeInspect(path: string) {
  return objects.get(path) ?? null;
}

export function fakeRemoveObject(path: string) {
  objects.delete(path);
}

export function fakeRegister(file: {
  projectId: string;
  fileId: string;
  name: string;
  size: number;
  contentType: AllowedType;
  uploaderName: string;
}): "ok" {
  files.push({
    id: file.fileId,
    projectId: file.projectId,
    name: file.name.trim(),
    sizeBytes: file.size,
    contentType: file.contentType,
    shared: false,
    uploaderName: file.uploaderName,
    createdAt: new Date().toISOString(),
  });
  return "ok";
}

export function fakeUpdateFile(
  id: string,
  change: { shared?: boolean; name?: string },
): "ok" | "not_found" {
  const file = fakeFindFile(id);
  if (!file) return "not_found";
  Object.assign(file, change);
  return "ok";
}

export function fakeDeleteFile(id: string): "ok" | "not_found" {
  const index = files.findIndex((file) => file.id === id);
  if (index === -1) return "not_found";
  files.splice(index, 1);
  return "ok";
}
