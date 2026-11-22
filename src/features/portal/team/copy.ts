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
  searchOpen: "Search projects and tickets (⌘K)",
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
    summary:
      "{open} open across {projects} · {overdue} overdue · {week} due this week",
    summaryShort: "{open} open · {overdue} overdue · {week} this week",
    projectOne: "1 project",
    projectMany: "{count} projects",
    groups: { overdue: "Overdue", thisWeek: "This week", later: "Later" },
    due: "Due {day}",
    noDue: "No due date",
    teamOnly: "Team only",
    showMore: "Show {count} more",
    openLabel: "Open {title} on the {project} board",
    statusLabels: {
      todo: "To do",
      in_progress: "In progress",
      in_review: "In review",
      blocked: "Blocked",
    },
    loadFailed: "We couldn't load your tickets. Refresh the page to try again.",
  },
  settings: {
    title: "Settings",
    readOnlyTitle: "Only admins can change settings",
    readOnlyBody: "Ask {admin} if something here needs to change.",
    back: "Back to projects",
    adminBody: "Admins only. Changes apply to every project.",
    loadFailed: "We couldn't load the settings. Refresh the page to try again.",
  },
} as const;

export type TeamPagesCopy = typeof teamPagesCopy;

/** The team project pages and the board (#137; Figma TM-02, TM-T02, TM-M02, TM-M03). */
export const teamProjectCopy = {
  breadcrumb: "Projects",
  back: "Projects",
  tabsLabel: "Project sections",
  tabs: {
    overview: "Overview",
    board: "Board",
    timeline: "Timeline",
    files: "Files",
    updates: "Updates",
    access: "Client access",
  },
  summary:
    "{stage} · {position} of {total} · {done} of {all} done · launch {launch}",
  summaryClient: " · client {email}",
  noStages: "No stages yet",
  health: {
    on_track: "On track",
    at_risk: "At risk",
    waiting_on_client: "Waiting on client",
  },
} as const;

export const boardCopy = {
  metaTitle: "Board",
  newTicket: "New ticket",
  filtersLabel: "Filter tickets",
  stage: "Stage",
  allStages: "All stages",
  owner: "Owner",
  everyone: "Everyone",
  unassigned: "Unassigned",
  dragHint:
    "Drag a card to change its status. The client sees changes when you save.",
  mobileHint: "Tap a status to move a ticket.",
  columns: {
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    done: "Done",
  },
  statusLabel: "Status",
  statuses: {
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    done: "Done",
    blocked: "Blocked",
  },
  more: "+{count} more",
  showMore: "Show {count} more in {column}",
  fewer: "Show fewer",
  teamOnly: "Team only",
  waitingOnClient: "Waiting on client",
  blocked: "Blocked",
  due: "Due",
  owner_: "Owner: {name}",
  noOwner: "No owner",
  moveMenu: "Move “{title}”",
  moveTo: "Move to",
  moved: "Moved “{title}” to {column}.",
  moveFailed: "Couldn't move “{title}”. It's back where it was.",
  columnEmpty: "Nothing here.",
  empty: "No tickets match these filters.",
  loadFailed: "We couldn't load the board. Refresh the page to try again.",
  notFound: "We couldn't find that ticket. It may have been deleted.",
} as const;

export const ticketEditorCopy = {
  editEyebrow: "Edit ticket · {ref}",
  newEyebrow: "New ticket · {project}",
  mobileEditTitle: "Edit ticket",
  mobileNewTitle: "New ticket",
  newTitle: "New ticket",
  close: "Close",
  title: "Title",
  status: "Status",
  due: "Due",
  stage: "Stage",
  owner: "Owner",
  noOwner: "No owner",
  description: "Description",
  checklist: "Checklist",
  checklistCount: "{done} of {total}",
  addItem: "+ Add item",
  newItem: "New checklist item",
  removeItem: "Remove “{label}”",
  visible: "Visible to the client",
  visibleHint:
    "{client} sees the title, status, due date, description and checklist. Turn off for internal work.",
  delete: "Delete ticket",
  cancel: "Cancel",
  save: "Save changes",
  /** The full-screen editor's top bar (TM-M03). */
  mobileSave: "Save",
  create: "Create ticket",
  saving: "Saving…",
  saved: "Saved “{title}”.",
  created: "Created “{title}”.",
  deleted: "Deleted “{title}”.",
  deleteTitle: "Delete “{title}”?",
  deleteVisible:
    "{client} will no longer see this task, its checklist or the updates linked to it. This can't be undone.",
  deleteHidden:
    "This ticket and its checklist will be deleted. The client never saw it. This can't be undone.",
  deleteConfirm: "Delete ticket",
  saveFailed:
    "We couldn't save your changes. Check your connection; your edits are still here.",
  retry: "Retry",
  conflictOne: "{name} changed {change} while you were editing.",
  conflictMany: "{name} changed {changes} while you were editing.",
  conflictSomeone: "Someone",
  conflictNothing: "{name} saved this ticket while you were editing.",
  seeTheirs: "See their change",
  keepMine: "Keep mine",
  changes: {
    title: "the title to “{value}”",
    status: "the status to {value}",
    dueOn: "the due date to {value}",
    dueCleared: "the due date (removed it)",
    stageId: "the stage to {value}",
    ownerId: "the owner to {value}",
    ownerCleared: "the owner (none now)",
    description: "the description",
    clientVisible: "client visibility ({value})",
    checklist: "the checklist",
  },
  visibilityOn: "visible",
  visibilityOff: "team only",
  forbidden: "You can't edit tickets on this project.",
  notFound: "This ticket was deleted while you were editing.",
  errors: {
    titleInvalid: "Enter a title (up to 160 characters).",
    descriptionInvalid: "Keep the description under 5,000 characters.",
    statusInvalid: "Choose a status.",
    stageInvalid: "Choose a stage.",
    ownerInvalid: "Choose someone on this project.",
    dueInvalid: "Enter a valid date.",
    checklistInvalid: "Checklist items need text (up to 200 characters).",
  },
} as const;

/** Team project overview (#138; Figma TM-07). */
export const teamOverviewCopy = {
  metaTitle: "Overview",
  newTicket: "New ticket",
  attentionTitle: "Needs attention",
  attention: {
    blockedOne: "{title}: blocked on the client for 1 day.",
    blockedMany: "{title}: blocked on the client for {days} days.",
    blockedToday: "{title}: blocked on the client since today.",
    notSignedIn: "{name} hasn't signed in since the invite on {date}.",
    inReview: "{title} has been in review for {days} days.",
  },
  openTicket: "Open ticket",
  overallProgress: "Overall progress",
  progressDone: "{done} of {total} tasks done",
  progressLabel: "{percent}% of tasks done",
  clientSees: "The client sees {done} of {total} · {percent}%",
  currentStage: "Current stage",
  stageOf: "Stage {position} of {total} · since {date}",
  noStages: "No stages yet",
  thisWeek: "This week",
  weekOne: "1 task",
  weekMany: "{count} tasks",
  launch: "Launch",
  daysToGoOne: "1 day to go",
  daysToGoMany: "{days} days to go",
  launched: "Launched",
  stagesTitle: "Project stages",
  viewTimeline: "View timeline",
  stageLabels: {
    now: "Now",
    done: "Done",
    upcoming: "Upcoming",
    current: "In progress",
  },
  from: "From",
  workingTitle: "What we're working on",
  workingIntro: "Open tasks in the current stage, most urgent first.",
  workingEmpty: "Nothing open in this stage.",
  viewBoard: "View board",
  due: "Due {date}",
  updatesTitle: "Latest updates",
  updatesEmpty: "No updates yet.",
  team: "NortBrand",
  statuses: {
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    done: "Done",
    blocked: "Blocked",
  },
  loadFailed: "We couldn't load this project. Refresh the page to try again.",
} as const;

/** Team timeline · manage stages (#138; Figma TM-05, TM-05b). */
export const timelineCopy = {
  metaTitle: "Timeline",
  healthTitle: "Project health",
  healthLabel: "Project health",
  suggested: {
    blocked_on_client_one:
      "Suggested: Waiting on client, because 1 ticket is blocked on them. The client sees this on their overview.",
    blocked_on_client_many:
      "Suggested: Waiting on client, because {count} tickets are blocked on them. The client sees this on their overview.",
    overdue_one:
      "Suggested: At risk, because 1 ticket is past due. The client sees this on their overview.",
    overdue_many:
      "Suggested: At risk, because {count} tickets are past due. The client sees this on their overview.",
    stage_late:
      "Suggested: At risk, because {stage} was planned to end on {date}. The client sees this on their overview.",
    on_track: "Suggested: On track. The client sees this on their overview.",
  },
  healthUpdate: {
    on_track: "Good news: the project is back on track.",
    at_risk:
      "A heads-up: the project is at risk of slipping. We'll share the plan to get back on track.",
    waiting_on_client:
      "We're waiting on you to keep going. See the tasks marked Needs you.",
  },
  launchTitle: "Launch target",
  launchLabel: "Launch target",
  launchHint:
    "Changing it posts an update and emails the client, so they always hear it from us first.",
  launchUpdate: "The launch date has moved to {date}.",
  postUpdate: "Post an update",
  updateText: "Update for the client",
  emailClient: "Email the client",
  emailClientHint: "Sends the update to everyone who can sign in.",
  save: "Save",
  cancel: "Cancel",
  saved: "Saved.",
  savedEmailed: "Saved and emailed the client.",
  savedEmailFailed:
    "Saved, but the email didn't go out. The update is on their portal.",
  stagesTitle: "Stages",
  stagesIntro:
    "Progress comes from tickets. Team-only tickets don't count towards what the client sees.",
  columns: { stage: "Stage", dates: "Dates", tickets: "Tickets" },
  start: "Start of {stage}",
  end: "End of {stage}",
  ongoing: "Ongoing",
  now: "Now",
  ticketsDone: "{done} of {total} done",
  noTickets: "No tickets yet",
  reopen: "Reopen",
  reopenLabel: "Reopen {stage}",
  reopened: "{stage} is open again.",
  locked:
    "{stage} is finished, so its dates are locked. Reopen it to change them.",
  complete: "Complete stage",
  footer:
    "Client sees: {done} of {total} tasks done · {percent}%. Dates of finished stages are locked; reopen a stage to change them.",
  datesSaved: "Dates saved.",
  errors: {
    dateInvalid: "Check the dates: the launch can't be before the start.",
    endBeforeStart: "The end can't be before the start.",
    bodyInvalid: "Keep the update under 4,000 characters.",
    locked: "That stage is finished; reopen it to change its dates.",
    not_current: "Only the current stage can be completed.",
    forbidden: "You can't change this project's plan.",
    failed: "Something went wrong and nothing changed. Please try again.",
  },
  completeDialog: {
    eyebrow: "Complete {stage} · {client}",
    titleOpen: "{stage} isn't finished yet",
    titleDone: "Complete {stage}",
    bodyOpen:
      "{open} of its {total} tickets are still open, and the stage is planned until {date}. Completing it now starts {next} today and moves the client's timeline forward.",
    bodyOpenNoNext:
      "{open} of its {total} tickets are still open. Completing it now marks the last stage done.",
    bodyDone:
      "All its tickets are done. Completing it starts {next} and moves the client's timeline forward.",
    bodyDoneNoNext: "All its tickets are done. This is the last stage.",
    openQuestionOne: "What happens to the open ticket?",
    openQuestionMany: "What happens to the {count} open tickets?",
    keep: "Keep them in {stage}",
    keepHint: "They stay open and still count towards the client's progress.",
    move: "Move them to {next}",
    moveHint: "They become {next} tickets and keep their status.",
    postMilestone: "Post a milestone update",
    milestoneText: "Milestone update",
    milestoneHint: "You can edit it after.",
    milestone: "{stage} is complete. We're now working on {next}.",
    milestoneLast: "{stage} is complete.",
    email: "Email the client",
    emailHint: "Sends the milestone to {email}.",
    emailHintAll: "Sends the milestone to everyone who can sign in.",
    cancel: "Cancel",
    confirm: "Complete stage",
    confirmAnyway: "Complete anyway",
    completed: "{stage} is complete.",
  },
} as const;

/** Posting and managing project updates (#139; Figma TM-03, TM-M04, TM-10). */
export const teamUpdatesCopy = {
  metaTitle: "Updates",
  postUpdate: "Post update",
  composer: "Share an update with {client}…",
  feedNote:
    "Clients see every post here. Edits show “edited”; deleted posts disappear from their feed.",
  groups: {
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This week",
    earlier: "Earlier",
  },
  edit: "Edit",
  editLabel: "Edit the update from {time}",
  delete: "Delete",
  deleteLabel: "Delete the update from {time}",
  edited: "edited",
  needsYou: "Needs you",
  milestone: "Milestone",
  empty:
    "No updates yet. Post the first one; the client gets it in tonight's digest.",
  linkedTask: "Task: {title}",
  deleteTitle: "Delete this update?",
  deleteBody: "It disappears from {client}'s feed. This can't be undone.",
  deleteConfirm: "Delete update",
  cancel: "Cancel",
  deleted: "Update deleted.",
  loadFailed: "We couldn't load the updates. Refresh the page to try again.",
  dialog: {
    eyebrow: "Post an update · {client}",
    editEyebrow: "Edit update · {client}",
    title: "What's new on the project?",
    editTitle: "Edit the update",
    close: "Close",
    body: "Update",
    linked: "Linked to",
    linkTask: "+ Link a task",
    linkTaskLabel: "Link a task",
    removeLink: "Remove the link to {title}",
    milestone: "Mark as a milestone",
    milestoneHint: "Shows with a green highlight in the client's feed.",
    needsClient: "Ask the client for something",
    needsClientHint:
      "Adds a “Needs you” tag and emails the client straight away.",
    previewTitle: "How {client} will see it",
    previewEmpty: "Your update appears here as the client will see it.",
    justNow: "Just now",
    footnote: "Clients get one email a day with new updates.",
    cancel: "Cancel",
    post: "Post update",
    save: "Save changes",
    posting: "Posting…",
    posted: "Update posted.",
    postedEmailed: "Update posted and emailed to the client.",
    postedEmailFailed:
      "Update posted, but the email didn't go out. It's in their feed and tonight's digest.",
    saved: "Update saved.",
    errors: {
      bodyRequired: "Write the update first.",
      bodyTooLong: "Keep the update under 4,000 characters.",
      tooManyLinks: "Link up to 10 tasks.",
      linkInvalid: "One of the linked tasks isn't on this project.",
      not_found: "That update was deleted.",
      forbidden: "You can't post on this project.",
      failed: "Something went wrong and nothing was posted. Please try again.",
    },
  },
} as const;

export type TeamUpdatesCopy = typeof teamUpdatesCopy;

/** Team files (#140; Figma TM-08). */
export const teamFilesCopy = {
  metaTitle: "Files",
  upload: "Upload file",
  dropTitle: "Drop files here to upload.",
  dropHint:
    "PDF, images, ZIP · up to 50 MB · new files are team only until you share them",
  chooseFiles: "Choose files to upload",
  uploading: "Uploading {name}…",
  uploaded: "Uploaded {name}. It's team only until you share it.",
  groups: { design: "Design", documents: "Documents" },
  groupIntro: {
    design: "Approved designs and brand material.",
    documents: "Everything we agreed.",
  },
  kinds: { pdf: "PDF", zip: "ZIP", image: "Image" },
  by: "{name} · {day}",
  visible: "Visible to client",
  teamOnly: "Team only",
  download: "Download",
  downloadLabel: "Download {name}",
  menu: "Actions for {name}",
  share: "Share with the client",
  unshare: "Make team only",
  rename: "Rename",
  delete: "Delete",
  shared: "{name} is visible to the client.",
  unshared: "{name} is team only now.",
  renameTitle: "Rename file",
  renameLabel: "File name",
  save: "Save",
  cancel: "Cancel",
  renamed: "Renamed.",
  deleteTitle: "Delete “{name}”?",
  deleteShared:
    "{client} will no longer be able to download it. This can't be undone.",
  deleteTeamOnly: "The client never saw it. This can't be undone.",
  deleteConfirm: "Delete file",
  deleted: "Deleted {name}.",
  empty:
    "No files yet. Upload designs and documents; share them when they're ready for the client.",
  loadFailed: "We couldn't load the files. Refresh the page to try again.",
  errors: {
    nameInvalid: "Give the file a name (up to 200 characters).",
    empty: "{name} is empty.",
    tooLarge: "{name} is over 50 MB.",
    typeNotAllowed:
      "{name} isn't a PDF, image or ZIP file, so it wasn't uploaded.",
    notFound: "That file is gone. Refresh the page.",
    forbidden: "You can't change files on this project.",
    failed: "Something went wrong with {name}. Please try again.",
    uploadFailed: "{name} didn't upload. Check your connection and try again.",
  },
} as const;

export type TeamFilesCopy = typeof teamFilesCopy;

/** Client access (#141; Figma TM-06 543:369, guarded states TM-09 547:612). */
export const teamAccessCopy = {
  metaTitle: "Client access",
  people: {
    title: "People who can sign in",
    intro: "Each person uses their own email with the Project ID.",
    add: "Add person",
    listLabel: "People who can sign in",
    active: "Active",
    invited: "Invited",
    locked: "Locked out",
    signedIn: "Signed in {when}",
    neverSignedIn: "Active · not signed in yet",
    inviteSent: "Invite sent {day} · not signed in yet",
    lockedDetail: "Too many wrong codes, {time} · unlocks at {unlocks}",
    resend: "Resend invite",
    unlock: "Unlock now",
    remove: "Remove",
    resendLabel: "Resend the invite to {name}",
    unlockLabel: "Unlock sign-in for {name}",
    removeLabel: "Remove {name}",
    resent: "Invite sent again to {email}.",
    unlocked: "{name} can sign in again.",
    removed: "{name} can no longer sign in.",
    adminOnly: "Only admins can change who signs in.",
  },
  add: {
    email: "Email",
    name: "Name (optional)",
    language: "Email language",
    languages: { pt: "Portuguese", en: "English" },
    hint: "They'll get the welcome email with the Project ID straight away.",
    cancel: "Cancel",
    send: "Send invite",
    added: "Invite sent to {email}.",
    addedNotSent:
      "{email} was added, but the welcome email didn't go out. Use Resend invite.",
  },
  remove: {
    title: "Remove {name}?",
    body: "{name} won't be able to sign in to {client} any more. Their past activity stays in the log.",
    confirm: "Remove",
    cancel: "Cancel",
    lastTitle: "Remove {name}?",
    lastBody:
      "{name} is the only person who can sign in to {client}. Add someone else first, or the client will lose access.",
    addFirst: "Add someone first",
  },
  projectId: {
    label: "Project ID",
    body: "Clients sign in with it and their email. It's in every welcome email.",
    copy: "Copy ID",
    copied: "Project ID copied.",
    copyFailed: "Couldn't copy. Select the ID and copy it yourself.",
    regenerate: "Regenerate ID",
    regenerateHint:
      "Use this if the ID was shared with the wrong person. Everyone is signed out and gets the new ID by email.",
    confirmTitle: "Regenerate the Project ID?",
    confirmBody:
      "Everyone at {client} is signed out now and gets the new ID by email. The old ID stops working at once.",
    confirm: "Regenerate ID",
    cancel: "Cancel",
    rotated: "New Project ID {id}. Everyone was signed out and emailed.",
    rotatedSomeFailed:
      "New Project ID {id}. Some emails didn't go out ({failed}); use Resend invite.",
  },
  activity: {
    title: "Sign-in activity",
    intro: "The last 30 days. Only the team can see this.",
    empty: "No sign-in activity in the last 30 days.",
    when: "{day} · {time}",
    today: "Today",
    events: {
      sign_in: "{person} signed in.",
      wrong_code: "{person} entered a wrong code.",
      locked:
        "{person} entered too many wrong codes. Sign-in is paused for {minutes} minutes.",
      lockout_cleared: "{actor} unlocked sign-in for {person}.",
      invite_sent: "{actor} sent an invite to {email}.",
      client_removed: "{actor} removed {person}.",
      project_id_rotated:
        "{actor} regenerated the Project ID. Everyone was signed out.",
    },
    someone: "Someone at NortBrand",
  },
  errors: {
    emailInvalid: "Enter an email like name@company.pt.",
    nameTooLong: "Keep the name under 80 characters.",
    alreadyAdded: "That email can already sign in to this project.",
    isTeammate: "That's a NortBrand teammate's email. Clients need their own.",
    lastPerson:
      "Add someone else first: this is the only person who can sign in.",
    notFound: "That person or project is gone. Refresh the page.",
    forbidden: "Only admins can change client access.",
    failed: "Something went wrong. Please try again.",
  },
  loadFailed: "We couldn't load client access. Refresh the page to try again.",
} as const;

export type TeamAccessCopy = typeof teamAccessCopy;

/** Search (#142; top bar, ⌘K; TM-09 "Search · no results"). */
export const teamSearchCopy = {
  title: "Search",
  description: "Find projects by name or Project ID, and tickets by title.",
  field: "Search projects and tickets",
  hint: "Type at least 2 characters.",
  searching: "Searching…",
  projects: "Projects",
  tickets: "Tickets",
  noResultsTitle: "No results for “{query}”",
  noResultsBody:
    "Search covers project names, Project IDs like NB-4821, and ticket titles.",
  failed: "Search didn't work. Try again.",
  resultsCount: "{count} results",
  close: "Close search",
} as const;

export type TeamSearchCopy = typeof teamSearchCopy;

/** The Team table (#142; Figma TM-12). */
export const teamTableCopy = {
  summary: "{people} · {projects}",
  peopleOne: "1 person",
  peopleMany: "{count} people",
  projectsOne: "1 active project",
  projectsMany: "{count} active projects",
  invite: "Invite teammate",
  closeInvite: "Close",
  tableLabel: "Teammates",
  columns: {
    person: "Person",
    role: "Role",
    projects: "Projects",
    openTickets: "Open tickets",
    lastActive: "Last active",
    actions: "Actions",
  },
  allProjects: "All {count} projects",
  /** An admin's cell when there is one active project ("All 1 projects" reads wrong). */
  allProjectsOne: "All projects",
  noProjects: "No projects yet",
  never: "Not signed in yet",
  now: "Now",
  minutesAgo: "{count} min ago",
  hoursAgo: "{count} h ago",
  today: "Today, {time}",
  roleLabel: "Role for {name}",
  you: "You",
  remove: "Remove",
  removeLabel: "Remove {name}",
  removeTitle: "Remove {name}?",
  removeBody:
    "Their tickets and updates go to each project's lead. They can't sign in any more.",
  roleSaved: "{name} is now {role}.",
  errors: {
    forbidden: "Only admins can change roles.",
    lastAdmin: "Someone must stay an admin. Make another teammate admin first.",
    notFound: "That teammate isn't on the team any more.",
    failed: "Something went wrong. Please try again.",
  },
  loadFailed: "We couldn't load the team. Refresh the page to try again.",
} as const;

export type TeamTableCopy = typeof teamTableCopy;
export type TeamOverviewCopy = typeof teamOverviewCopy;
export type TimelineCopy = typeof timelineCopy;
export type TeamProjectCopy = typeof teamProjectCopy;
export type BoardCopy = typeof boardCopy;
export type TicketEditorCopy = typeof ticketEditorCopy;

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

/**
 * Workspace Settings (#159; Figma TM-13 546:583). Not drawn in TM-13, added within the
 * system: the "Team sign-in" section (allowed team domain, ADR-009), the template
 * editor behind "Edit template", and the save states.
 */
export const settingsCopy = {
  formLabel: "Workspace settings",
  clientSignIn: {
    title: "Client sign-in",
    body: "Keeps client projects private. These are the recommended defaults.",
    codeExpiry: "Codes expire after",
    codeExpiryHint: "How long the emailed 6-digit code works.",
    codeExpiryLocked: "Set by the sign-in service. It can't be changed here.",
    minutes: "{count} minutes",
    minuteOne: "1 minute",
    tries: "Wrong codes allowed",
    triesHint: "After this, the code is cancelled and sign-in pauses.",
    pause: "Pause after too many tries",
    hours: "{count} hours",
    hourOne: "1 hour",
    dayOne: "1 day",
    days: "{count} days",
    session: "Stay signed in for",
    sessionHint: "On the same device, unless the client signs out.",
  },
  notifications: {
    title: "Notifications",
    digest: "Client digest",
    digestHint: "One email a day with new updates, only if there are any.",
    digestOn: "Daily at 18:00",
    digestOff: "Off",
    needsYou: "“Needs you” posts email right away",
    needsYouHint: "Requests to the client never wait for the digest.",
    needsYouLocked: "Always on",
    firstSignIn: "Tell me when a client signs in for the first time",
    firstSignInHint: "Emails the project lead.",
  },
  team: {
    title: "Team sign-in",
    body: "Who can be invited to the team portal.",
    domain: "Allowed team domain",
    domainHint:
      "Invites must use an email at this domain. Leave it empty to allow any email.",
    domainPlaceholder: "Any email",
  },
  template: {
    title: "Stage template",
    body: "New projects start from this. Durations spread between the start and launch dates.",
    listLabel: "Stages in the template",
    weekOne: "1 week",
    weeks: "{count} weeks",
    launchDay: "Launch day",
    ongoing: "Ongoing",
    edit: "Edit template",
    done: "Done",
    editorLabel: "Edit the stage template",
    stageName: "Stage {index} name",
    stageWeeks: "Stage {index} weeks",
    weeksUnit: "weeks",
    launchName: "Launch stage name",
    afterName: "Care stage name",
    moveUp: "Move {name} up",
    moveDown: "Move {name} down",
    remove: "Remove {name}",
    add: "Add stage",
    newStage: "New stage",
    fixedNote:
      "Launch is the launch day and Care has no end, so neither has a duration.",
  },
  discard: "Discard",
  save: "Save settings",
  saving: "Saving…",
  saved: "Settings saved",
  errors: {
    domainInvalid: "Enter a domain like studio.pt, without the @.",
    stageNameInvalid: "Give every stage a name, up to 60 characters.",
    weeksInvalid: "Use 1 to 52 weeks.",
    templateInvalid: "The template needs at least one stage before Launch.",
    stageNamesRepeat: "Two stages have the same name.",
    forbidden: "Only admins can change settings.",
    stale:
      "Another admin saved settings after you opened this page. Discard to load theirs, then make your change again.",
    failed: "Settings weren't saved. Please try again.",
    fix: "Check the highlighted fields.",
  },
} as const;

export type SettingsCopy = typeof settingsCopy;

/** To the project lead on a client's first sign-in (#159). Team emails are English. */
export const firstSignInEmailCopy = {
  subject: "{client} signed in to {project}",
  preview: "{client} opened the {project} portal for the first time.",
  heading: "{client} has signed in",
  body: "Hi {lead}, {client} signed in to the {project} portal for the first time. You can see their sign-ins on the project's Client access page.",
  button: "Open Client access",
  fallback: "Or copy this link:",
  footer:
    "You get this because “Tell me when a client signs in for the first time” is on in {studio} Settings.",
} as const;

/** View as client (#160; Figma TM-07 “View as client”). The banner is not drawn in Figma. */
export const previewCopy = {
  viewAsClient: "View as client",
  banner: "Previewing as the client · read-only",
  bannerLabel: "Client preview",
  language: "Client’s language",
  languages: { en: "EN", pt: "PT" },
  languageNames: { en: "English", pt: "Portuguese" },
  exit: "Back to project",
  loadFailed: "We couldn’t load the preview. Refresh the page to try again.",
} as const;

export type PreviewCopy = typeof previewCopy;
