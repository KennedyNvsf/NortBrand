import { describe, expect, it, vi } from "vitest";

import {
  deleteFile,
  finishUpload,
  prepareUpload,
  shareFile,
} from "./files-edit";
import { MAX_FILE_BYTES } from "./magic";

const VIEWER = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Tiago Sousa",
  role: "member",
} as const;
const PROJECT = "00000000-0000-4000-b000-000000000001";
const FILE = "00000000-0000-4000-a000-0000000000f1";
const PDF = new TextEncoder().encode("%PDF-1.7\n%âã");
const TEXT = new TextEncoder().encode("Just some text, not a PDF");

const base = () => ({
  viewer: () => Promise.resolve(VIEWER),
  reportFailure: vi.fn(),
});

describe("prepareUpload", () => {
  it("signs an upload into the project's own folder", async () => {
    const signUpload = vi.fn(() =>
      Promise.resolve({ uploadUrl: "https://storage/upload" }),
    );
    expect(
      await prepareUpload(
        {
          projectId: PROJECT,
          name: "Home page design.pdf",
          size: 4_200_000,
          contentType: "application/pdf",
        },
        { ...base(), newId: () => FILE, signUpload },
      ),
    ).toEqual({
      status: "ready",
      fileId: FILE,
      uploadUrl: "https://storage/upload",
    });
    expect(signUpload).toHaveBeenCalledWith(`projects/${PROJECT}/${FILE}`);
  });

  it("refuses an oversized file, a disallowed type and an empty one before signing", async () => {
    const signUpload = vi.fn();
    const deps = { ...base(), newId: () => FILE, signUpload };
    expect(
      await prepareUpload(
        {
          projectId: PROJECT,
          name: "big.zip",
          size: MAX_FILE_BYTES + 1,
          contentType: "application/zip",
        },
        deps,
      ),
    ).toEqual({ status: "refused", error: "tooLarge" });
    expect(
      await prepareUpload(
        {
          projectId: PROJECT,
          name: "logo.svg",
          size: 900,
          contentType: "image/svg+xml",
        },
        deps,
      ),
    ).toEqual({ status: "refused", error: "typeNotAllowed" });
    expect(
      await prepareUpload(
        {
          projectId: PROJECT,
          name: "nothing.pdf",
          size: 0,
          contentType: "application/pdf",
        },
        deps,
      ),
    ).toEqual({ status: "refused", error: "empty" });
    expect(signUpload).not.toHaveBeenCalled();
  });
});

describe("finishUpload", () => {
  const input = {
    projectId: PROJECT,
    fileId: FILE,
    name: " Home page design ",
  };

  it("registers a real PDF with its true size, team-only", async () => {
    const register = vi.fn(() => Promise.resolve("ok" as const));
    const result = await finishUpload(input, {
      ...base(),
      inspect: () => Promise.resolve({ head: PDF, size: 4_200_000 }),
      removeObject: vi.fn(),
      register,
    });
    expect(result).toEqual({ status: "saved" });
    expect(register).toHaveBeenCalledWith({
      projectId: PROJECT,
      fileId: FILE,
      name: "Home page design",
      size: 4_200_000,
      contentType: "application/pdf",
    });
  });

  it("deletes and refuses a file that isn't what it claims, whatever its name", async () => {
    const removeObject = vi.fn(() => Promise.resolve());
    const register = vi.fn();
    expect(
      await finishUpload(
        { ...input, name: "invoice.pdf" },
        {
          ...base(),
          inspect: () => Promise.resolve({ head: TEXT, size: 25 }),
          removeObject,
          register,
        },
      ),
    ).toEqual({ status: "refused", error: "typeNotAllowed" });
    expect(removeObject).toHaveBeenCalledWith(`projects/${PROJECT}/${FILE}`);
    expect(register).not.toHaveBeenCalled();
  });

  it("deletes and refuses a file that turns out larger than 50 MB", async () => {
    const removeObject = vi.fn(() => Promise.resolve());
    expect(
      await finishUpload(input, {
        ...base(),
        inspect: () => Promise.resolve({ head: PDF, size: MAX_FILE_BYTES + 1 }),
        removeObject,
        register: vi.fn(),
      }),
    ).toEqual({ status: "refused", error: "tooLarge" });
    expect(removeObject).toHaveBeenCalled();
  });

  it("refuses when nothing was uploaded, and cleans up if registering fails", async () => {
    expect(
      await finishUpload(input, {
        ...base(),
        inspect: () => Promise.resolve(null),
        removeObject: vi.fn(),
        register: vi.fn(),
      }),
    ).toEqual({ status: "refused", error: "notFound" });

    const removeObject = vi.fn(() => Promise.resolve());
    expect(
      await finishUpload(input, {
        ...base(),
        inspect: () => Promise.resolve({ head: PDF, size: 10 }),
        removeObject,
        register: () => Promise.resolve({ error: { code: "42501" } }),
      }),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(removeObject).toHaveBeenCalled();
  });
});

describe("share and delete", () => {
  it("shares under the teammate's session", async () => {
    const save = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await shareFile(
        { projectId: PROJECT, fileId: FILE, shared: true },
        { ...base(), save },
      ),
    ).toEqual({
      status: "saved",
    });
    expect(save).toHaveBeenCalledWith({
      projectId: PROJECT,
      fileId: FILE,
      shared: true,
    });
  });

  it("removes the row first, then the object; a stuck object is reported, not shown", async () => {
    const order: string[] = [];
    const deps = {
      ...base(),
      removeRow: () => {
        order.push("row");
        return Promise.resolve("ok" as const);
      },
      removeObject: () => {
        order.push("object");
        return Promise.reject(new Error("storage down"));
      },
    };
    expect(
      await deleteFile({ projectId: PROJECT, fileId: FILE }, deps),
    ).toEqual({ status: "saved" });
    expect(order).toEqual(["row", "object"]);
    expect(deps.reportFailure).toHaveBeenCalledWith("delete_object", undefined);
  });

  it("refuses signed-out callers", async () => {
    const save = vi.fn();
    expect(
      await shareFile(
        { projectId: PROJECT, fileId: FILE, shared: true },
        {
          viewer: () => Promise.resolve({ status: "signed_out" }),
          reportFailure: vi.fn(),
          save,
        },
      ),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(save).not.toHaveBeenCalled();
  });
});
