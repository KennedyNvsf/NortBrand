import type {
  AccessEvent,
  AccessEventKind,
  ClientPerson,
  Lockout,
} from "./access-rules";

/**
 * A fake client-access store for Playwright (#141), used only when
 * isFakeBackendEnabled(). Project NB-1234 starts with an active, an invited and a paused
 * person. Rotating changes only the ID this page shows: other specs keep opening NB-1234,
 * so the fake never renames the project itself. The rules run for real in SQL (pgTAP 14)
 * and in access-rules.ts. One store per server process, kept on globalThis because route
 * handlers and page actions load separate module copies.
 */

type Store = {
  publicId: string;
  people: ClientPerson[];
  lockouts: Lockout[];
  events: AccessEvent[];
  nextEventId: number;
};

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

function seed(): Store {
  return {
    publicId: "NB-1234",
    people: [
      {
        id: "00000000-0000-4000-a000-00000000c001",
        email: "joao@e2e.example",
        name: "João Marques",
        locale: "pt",
        status: "active",
        invitedAt: "2026-09-20T10:00:00Z",
        lastSignInAt: minutesAgo(60),
      },
      {
        id: "00000000-0000-4000-a000-00000000c002",
        email: "leonor@e2e.example",
        name: "Leonor Faria",
        locale: "pt",
        status: "invited",
        invitedAt: "2026-11-10T16:02:00Z",
        lastSignInAt: null,
      },
      {
        id: "00000000-0000-4000-a000-00000000c003",
        email: "hugo@e2e.example",
        name: "Hugo Pinto",
        locale: "en",
        status: "active",
        invitedAt: "2026-09-20T10:00:00Z",
        lastSignInAt: "2026-11-01T09:00:00Z",
      },
    ],
    lockouts: [
      {
        email: "hugo@e2e.example",
        lockedAt: minutesAgo(5),
        unlocksAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    ],
    events: [
      {
        id: 3,
        kind: "locked",
        occurredAt: minutesAgo(5),
        email: "hugo@e2e.example",
        actorName: null,
      },
      {
        id: 2,
        kind: "sign_in",
        occurredAt: minutesAgo(60),
        email: "joao@e2e.example",
        actorName: null,
      },
      {
        id: 1,
        kind: "invite_sent",
        occurredAt: "2026-11-10T16:02:00Z",
        email: "leonor@e2e.example",
        actorName: "Ana Costa",
      },
    ],
    nextEventId: 4,
  };
}

const holder = globalThis as typeof globalThis & {
  __nbFakeClientAccess?: Store;
};
holder.__nbFakeClientAccess ??= seed();
const store = holder.__nbFakeClientAccess;

export function fakeClientAccess() {
  return {
    publicId: store.publicId,
    people: store.people.map((person) => ({ ...person })),
    lockouts: store.lockouts.filter(
      (lockout) => new Date(lockout.unlocksAt) > new Date(),
    ),
    events: [...store.events].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
  };
}

function log(kind: AccessEventKind, email: string | null, actorName: string) {
  store.events.push({
    id: store.nextEventId++,
    kind,
    occurredAt: new Date().toISOString(),
    email,
    actorName,
  });
}

export function fakeAddPerson(
  person: { email: string; name: string | null; locale: "en" | "pt" },
  actorName: string,
): "ok" | "already_added" | "client_is_teammate" {
  if (person.email.endsWith("@nortbrand.pt")) return "client_is_teammate";
  if (store.people.some((entry) => entry.email === person.email)) {
    return "already_added";
  }
  store.people.push({
    id: crypto.randomUUID(),
    email: person.email,
    name: person.name,
    locale: person.locale,
    status: "invited",
    invitedAt: new Date().toISOString(),
    lastSignInAt: null,
  });
  log("invite_sent", person.email, actorName);
  return "ok";
}

export function fakeFindPerson(clientId: string): ClientPerson | null {
  return store.people.find((person) => person.id === clientId) ?? null;
}

export function fakeLogInvite(email: string, actorName: string) {
  log("invite_sent", email, actorName);
}

export function fakeRemovePerson(
  clientId: string,
  actorName: string,
): "ok" | "not_found" | "last_person" {
  const person = fakeFindPerson(clientId);
  if (!person) return "not_found";
  if (store.people.length === 1) return "last_person";
  store.people = store.people.filter((entry) => entry.id !== clientId);
  log("client_removed", person.email, actorName);
  return "ok";
}

export function fakeRotate(actorName: string) {
  let next = store.publicId;
  while (next === store.publicId || next === "NB-1234") {
    next = `NB-${String(1000 + Math.floor(Math.random() * 9000))}`;
  }
  store.publicId = next;
  log("project_id_rotated", null, actorName);
  return {
    publicId: next,
    people: store.people.map((person) => ({ ...person })),
  };
}

export function fakeClearLockout(email: string, actorName: string): boolean {
  const before = store.lockouts.length;
  store.lockouts = store.lockouts.filter((lockout) => lockout.email !== email);
  const cleared = store.lockouts.length < before;
  if (cleared) log("lockout_cleared", email, actorName);
  return cleared;
}
