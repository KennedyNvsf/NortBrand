import type { FlowCopy } from "../auth/components/copy";

/*
 * Team portal copy (#132). The team portal is English only (ADR-009), so its strings are
 * typed here rather than in messages/*.json, which must hold the same keys in EN and PT.
 *
 * Copy change from Figma TM-14 (lead's decision, 2026-11-13; ADR-008): team access is
 * invite-only by any email, so "Use your NortBrand email" and "Only @nortbrand.com
 * addresses can sign in here" became the lines below. Logged in docs/tech-debt.md for
 * design.
 */

export const teamSignInCopy: FlowCopy = {
  eyebrow: "NortBrand team",
  title: "Team sign-in.",
  intro: "Use the email your invite was sent to. We'll send you a code.",
  email: "Email",
  emailPlaceholder: "you@company.com",
  send: "Send me a code",
  sending: "Sending…",
  sendNote: "Only invited teammates can sign in here.",
  noMatch:
    "We couldn't find a teammate with that email. Ask an admin to invite you.",
  locked:
    "Too many wrong codes. For your security, sign-in is paused for 15 minutes.",
  rateLimited: "Too many requests. Please wait a few minutes and try again.",
  failed: "Something went wrong on our side. Please try again in a moment.",
  codeTitle: "Check your email.",
  codeIntro: "We sent a 6-digit code to {email}. It expires in 10 minutes.",
  codeLabel: "6-digit code",
  codeSubmit: "Open the workspace",
  codeChecking: "Checking…",
  codeWrongOne: "That code didn't match. You have 1 try left.",
  codeWrongOther: "That code didn't match. You have {tries} tries left.",
  resendWait: "Didn't get it? You can resend in",
  resendPrompt: "Didn't get it?",
  resendAction: "Send a new code",
  codeSentAgain: "We sent a new code.",
  wrongAddress: "Wrong address?",
  useDifferentEmail: "Use a different email",
  expiredTitle: "That code has expired.",
  expiredBody:
    "For your security, codes only work for 10 minutes. We'll send a fresh one to {email}.",
  expiredAction: "Send a new code",
  signedOutTitle: "You've been signed out.",
  signedOutBody:
    "For your security, sessions end after 30 days. Sign in again with a new code; it takes a minute.",
  signedOutAction: "Sign in again",
  errors: {
    emailInvalid: "Enter a valid email address.",
    projectIdInvalid: "Enter your Project ID, like NB-4821.",
    codeInvalid: "Enter the 6-digit code from the email.",
  },
};

export const teamBrandCopy = {
  eyebrow: "Team workspace",
  /** Figma breaks the line after the comma (TM-14). */
  titleLines: ["Every project,", "one place."],
  body: "Tickets, stages, updates and client access for everything the studio is working on.",
  stages: ["Discovery", "Design", "Development", "Review", "Launch", "Care"],
  clientPrompt: "Are you a client?",
  clientLink: "Track your project",
} as const;

export const teamPageCopy = {
  metaTitle: "Team",
  title: "Team",
  eyebrow: "Team workspace",
  admin: "Admin",
  member: "Member",
  adminSummary:
    "Creates projects, manages client access and Project IDs, and changes settings.",
  memberSummary:
    "Works on tickets, moves stages forward and posts updates on their projects.",
  you: "You",
  inviteTitle: "Invite a teammate",
  name: "Name",
  email: "Email",
  role: "Role",
  invite: "Send invite",
  inviting: "Inviting…",
  invited: "Invited. They can sign in at /team/sign-in with a code.",
  remove: "Remove",
  removing: "Removing…",
  cancel: "Cancel",
  removeConfirm:
    "Remove {name}? Their tickets and updates go to each project's lead.",
  removed:
    "Removed. Their tickets and updates now belong to each project's lead.",
  readOnly:
    "Only admins can invite or remove teammates. Ask {admin} if something needs to change.",
  footnote:
    "Teammates sign in with the email their invite was sent to. Removing someone keeps their tickets and updates, reassigned to the project lead.",
  signOut: "Sign out",
  errors: {
    nameInvalid: "Enter a name (up to 80 characters).",
    emailInvalid: "Enter a valid email address.",
    roleInvalid: "Choose a role.",
    forbidden: "Only admins can do that.",
    domainNotAllowed:
      "Invites are limited to the allowed email domain (Settings).",
    alreadyMember: "That person is already on the team.",
    cannotRemoveSelf: "You can't remove yourself. Ask another admin.",
    projectLead: "They lead an active project. Choose a new lead first.",
    notFound: "That teammate isn't on the team any more.",
    failed: "Something went wrong on our side. Please try again in a moment.",
  },
} as const;

export type TeamPageCopy = typeof teamPageCopy;

/** The team shell (#133; TM-01 528:189, TM-T01 560:957, TM-M01 559:646). */
export const teamShellCopy = {
  badge: "Team",
  workspace: "Workspace",
  navLabel: "Workspace sections",
  nav: {
    projects: "Projects",
    myTickets: "My tickets",
    team: "Team",
    settings: "Settings",
  },
  search: "Search projects and tickets",
  searchSoon: "Search arrives with the My tickets / Team / Settings ticket.",
  account: "Account",
  signOut: "Sign out",
  loading: "Loading the workspace",
} as const;

/** Team workspace pages until their content ships (#133; TM-09 states). */
export const teamPagesCopy = {
  projects: {
    title: "Projects",
    emptyTitle: "No projects yet",
    emptyBody:
      "Create a project to give a client their Project ID and their own portal.",
    emptyMemberBody: "When an admin adds you to a project, it shows up here.",
    newProject: "New project",
    summary:
      "{active} active · {waiting} waiting on a client · {soon} launching before {month}",
    tabsLabel: "Filter projects",
    tabs: {
      active: "Active",
      waiting: "Waiting on client",
      launched: "Launched",
      archived: "Archived",
    },
    viewEmpty: {
      active: "No active projects.",
      waiting: "No project is waiting on a client.",
      launched: "No launched projects yet.",
      archived: "Nothing archived.",
    },
    columns: {
      project: "Project",
      stage: "Stage",
      progress: "Progress",
      health: "Health",
      launch: "Launch",
      lead: "Lead",
      lastUpdate: "Last update",
    },
    health: {
      on_track: "On track",
      at_risk: "At risk",
      waiting_on_client: "Waiting on client",
    },
    stageOf: "{stage} · {position} of {total}",
    noStages: "No stages yet",
    launchOn: "Launch {date}",
    leadLabel: "Lead: {name}",
    age: {
      today: "Today",
      yesterday: "Yesterday",
      days: "{days} days ago",
      none: "No updates",
    },
    loadFailed: "We couldn't load the projects. Refresh the page to try again.",
  },
  newProject: {
    eyebrow: "New project",
    title: "Start a project and invite the client",
    close: "Close",
    projectSection: "Project",
    name: "Project name",
    namePlaceholder: "Client · Website",
    lead: "Project lead",
    clientSection: "Client",
    company: "Company",
    language: "Email language",
    languages: { pt: "Portuguese", en: "English" },
    emails: "Who can sign in",
    emailsPlaceholder: "Add another email",
    emailsEmptyPlaceholder: "name@company.com",
    removeEmail: "Remove {email}",
    emailsHint:
      "Each person signs in with their own email and the Project ID. Remove an email to revoke access.",
    planSection: "Plan",
    start: "Start",
    launch: "Launch target",
    stages: "Stages",
    stagePreview: "Stage dates",
    from: "From",
    planHint:
      "Dates are spread from the start and launch. You can adjust each stage after creating the project.",
    projectId: "Project ID",
    projectIdHint:
      "Generated and unique. It goes out in the welcome email; you never type it.",
    projectIdLater: "Generated when you create the project.",
    copy: "Copy",
    copied: "Copied",
    sendWelcome: "Send the welcome email now",
    sendWelcomeHint:
      "Includes the sign-in link and the Project ID. You can resend it from Client access.",
    cancel: "Cancel",
    create: "Create project",
    creating: "Creating…",
    created: "{project} is ready · {id}",
    createdSent: "Welcome email sent to {count}.",
    createdNotSent: "No welcome email was sent. Send it from Client access.",
    emailFailed:
      "The project is ready, but the welcome email to {emails} didn't go out. Resend it from Client access.",
    errors: {
      nameInvalid: "Enter a project name (up to 120 characters).",
      clientNameInvalid: "Enter the client's company (up to 120 characters).",
      leadInvalid: "Choose a project lead.",
      dateInvalid: "Enter a date.",
      launchBeforeStart: "The launch can't be before the start.",
      launchTooSoon:
        "Leave at least {days} days between the start and the launch.",
      templateInvalid: "Choose a stage template.",
      emailInvalid: "Check the email addresses: one isn't valid.",
      emailsRequired: "Add at least one email.",
      emailsTooMany: "Up to 10 people per project.",
      localeInvalid: "Choose a language.",
      emailNotValid: "That isn't a valid email address.",
      teammate: "{emails} belongs to a teammate. Clients need their own email.",
      forbidden: "Only admins can create projects.",
      failed: "Something went wrong and nothing was created. Please try again.",
    },
  },
  myTickets: {
    title: "My tickets",
    emptyTitle: "Nothing assigned to you",
    emptyBody: "Tickets you own show up here, most urgent first.",
  },
  settings: {
    title: "Settings",
    readOnlyTitle: "Only admins can change settings",
    readOnlyBody: "Ask {admin} if something here needs to change.",
    back: "Back to projects",
    adminBody:
      "Workspace settings (allowed email domain, code limits, notifications) arrive with the Settings ticket.",
  },
} as const;

export type TeamPagesCopy = typeof teamPagesCopy;

/** The states page (#133): TM-09 and CP-08, live. Team only. */
export const teamStatesCopy = {
  metaTitle: "States",
  eyebrow: "States",
  title: "Off the happy path",
  intro:
    "Every state the portal can be in, as real components. Design reviews them here; pages use the same parts.",
  loading: {
    label: "Loading",
    note: "Only after 300 ms; the final layout, no shimmer.",
  },
  empty: {
    label: "Client · new project",
    title: "We're setting up your project.",
    body: "Your team will post the first update here within one working day. Until then, your welcome email has everything you need.",
    action: "Message your team",
  },
  firstRun: {
    label: "Projects · first run",
    title: "No projects yet",
    body: "Create a project to give a client their Project ID and their own portal.",
    action: "New project",
  },
  saveFailed: {
    label: "Ticket · save failed",
    field: "Title",
    value: "Home page build",
    message:
      "We couldn't save your changes. Check your connection; your edits are still here.",
    retry: "Retry",
    cancel: "Cancel",
    saved: "Saved",
  },
  conflict: {
    label: "Ticket · edited by someone else",
    message: "Rui Matos changed the due date to 22 Nov while you were editing.",
    seeTheirs: "See their change",
    keepMine: "Keep mine",
    keptMine: "Kept your version",
    showingTheirs: "Showing their change",
  },
  remove: {
    label: "Ticket · delete",
    open: "Delete ticket",
    title: "Delete “Home page build”?",
    body: "Atlântico Café will no longer see this task, its checklist or the updates linked to it. This can't be undone.",
    confirm: "Delete ticket",
    cancel: "Cancel",
    deleted: "Ticket deleted",
  },
  search: {
    label: "Search · no results",
    field: "Search",
    title: "No results for “{query}”",
    body: "Search covers project names, Project IDs like NB-4821, and ticket titles.",
  },
  readOnly: {
    label: "Settings · members",
    title: "Only admins can change settings",
    body: "Ask Ana Costa if something here needs to change.",
    action: "Back to projects",
  },
  signedOut: {
    label: "Session ended",
    title: "You've been signed out.",
    body: "For your security, sessions end after 30 days. Sign in again with a new code; it takes a minute.",
    action: "Sign in again",
  },
} as const;
