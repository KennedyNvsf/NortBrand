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
