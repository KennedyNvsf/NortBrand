"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { checkDetails } from "../client-validation";
import type { SignInErrorKey } from "../schema";
import type { RequestCodeResult, VerifyCodeResult } from "../sign-in";
import { CodeInput } from "./code-input";
import { fill, type FlowCopy } from "./copy";

/*
 * The sign-in flow shared by client sign-in (Figma CP-01, CP-02, CP-08; #131) and team
 * sign-in (TM-14; #132). The wrappers (client-sign-in.tsx, team-sign-in.tsx) supply the
 * server actions, the navigation after sign-in, the help line and, for clients, the
 * Project ID field.
 *   details → (code sent) → code → (signed in) → onSignedIn
 *                                 ↘ expired (10 minutes, or 3 wrong codes) → code again
 * - Every server answer is re-checked on the server (actions.ts → sign-in.ts); the
 *   browser only validates for quick feedback.
 * - No match, a closed project and an unknown email all show one message (CP-08), so
 *   the page can't be used to test Project IDs.
 * - Steps swap instantly (14 Portal — Motion: content swaps never slide) and focus moves
 *   to the new heading; errors are announced. Signing in turns the boxes green and the
 *   form fades out (150 ms, ease-in) before the project opens.
 */

const RESEND_SECONDS = 60;
const EXIT_MS = 150;

type Notice = "noMatch" | "locked" | "rateLimited" | "failed";
type Contact = { email: string; projectId: string | null; maskedEmail: string };

type Details = { email: string; projectId: string | null };

export type ProjectIdField = {
  label: string;
  placeholder: string;
  hint: string;
};

type Step =
  | { name: "details"; notice?: Notice }
  | ({
      name: "code";
      resendAt: number;
      error?: string;
      resent?: boolean;
    } & Contact)
  | ({ name: "expired"; notice?: Notice } & Contact)
  | { name: "signedOut" }
  | { name: "signedIn" };

const subscribeToNothing = () => () => {};

const readSignedOutReason = () =>
  new URLSearchParams(window.location.search).get("reason") === "signed-out";

export function SignInFlow({
  copy,
  projectIdField,
  requestCode,
  verifyCode,
  onSignedIn,
  help,
}: {
  copy: FlowCopy;
  /** Client sign-in only: the Project ID field. */
  projectIdField?: ProjectIdField;
  requestCode: (details: Details) => Promise<RequestCodeResult>;
  verifyCode: (
    details: Details & { code: string },
  ) => Promise<VerifyCodeResult>;
  /** Called once the form has faded out (EXIT_MS): open what the user signed in to. */
  onSignedIn: (projectId: string | null) => void;
  /** The line under the form ("Lost your Project ID?", "Are you a client?"). */
  help: ReactNode;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [stepState, setStep] = useState<Step>({ name: "details" });
  const [pending, startTransition] = useTransition();
  const firstRender = useRef(true);

  // The form is part of the page's static shell (it never waits for the session), so
  // "You've been signed out" (CP-08) comes from the URL, read after hydration (the
  // server snapshot is false). The page's SessionGate sends an ended session here with
  // ?reason=signed-out. "Sign in again" dismisses it.
  const signedOutInUrl = useSyncExternalStore(
    subscribeToNothing,
    readSignedOutReason,
    () => false,
  );
  const [signedOutDismissed, setSignedOutDismissed] = useState(false);
  const showSignedOut =
    signedOutInUrl && !signedOutDismissed && stepState.name === "details";
  const step: Step = showSignedOut ? { name: "signedOut" } : stepState;

  // Focus follows the step, but not on page load (the signed-out screen only ever
  // appears on page load).
  useEffect(() => {
    if (firstRender.current || step.name === "signedOut") {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step.name]);

  const noticeText = (notice: Notice | undefined) =>
    notice ? copy[notice] : undefined;

  const afterRequest = (
    result: RequestCodeResult,
    onError: (notice: Notice) => void,
  ) => {
    switch (result.status) {
      case "code_sent":
        setStep({
          name: "code",
          email: result.email,
          projectId: result.projectId,
          maskedEmail: result.maskedEmail,
          resendAt: Date.now() + RESEND_SECONDS * 1000,
        });
        return;
      case "no_match":
        onError("noMatch");
        return;
      case "locked":
      case "rate_limited":
        onError(result.status === "locked" ? "locked" : "rateLimited");
        return;
      default:
        onError("failed");
    }
  };

  const resend = (contact: Contact) => {
    startTransition(async () => {
      const result = await requestCode({
        email: contact.email,
        projectId: contact.projectId,
      });
      if (result.status === "code_sent") {
        setStep({
          name: "code",
          ...contact,
          resendAt: Date.now() + RESEND_SECONDS * 1000,
          resent: true,
        });
        return;
      }
      afterRequest(result, (notice) => {
        setStep(
          notice === "locked"
            ? { name: "details", notice }
            : { name: "expired", ...contact, notice },
        );
      });
    });
  };

  let content: ReactNode;
  switch (step.name) {
    case "signedOut":
      content = (
        <StepIntro
          headingRef={heading}
          eyebrow={copy.eyebrow}
          title={copy.signedOutTitle}
          intro={copy.signedOutBody}
        >
          <Button
            showIcon
            className="w-full"
            onClick={() => {
              setSignedOutDismissed(true);
            }}
          >
            {copy.signedOutAction}
          </Button>
        </StepIntro>
      );
      break;

    case "expired":
      content = (
        <StepIntro
          headingRef={heading}
          eyebrow={copy.eyebrow}
          title={copy.expiredTitle}
          intro={fill(copy.expiredBody, { email: step.maskedEmail })}
        >
          <Notice id={`${id}-notice`} text={noticeText(step.notice)} />
          <Button
            showIcon
            loading={pending}
            className="w-full"
            onClick={() => {
              resend(step);
            }}
          >
            {copy.expiredAction}
          </Button>
          <ActionLine
            prompt=""
            action={copy.useDifferentEmail}
            onAction={() => {
              setStep({ name: "details" });
            }}
          />
        </StepIntro>
      );
      break;

    case "code":
    case "signedIn":
      content =
        step.name === "code" ? (
          <CodeStep
            key={`${step.email}|${String(step.resendAt)}`}
            step={step}
            copy={copy}
            verifyCode={verifyCode}
            headingRef={heading}
            onSignedIn={(projectId) => {
              setStep({ name: "signedIn" });
              window.setTimeout(() => {
                onSignedIn(projectId);
              }, EXIT_MS);
            }}
            onExpired={(notice) => {
              setStep({ ...step, name: "expired", notice });
            }}
            onLocked={() => {
              setStep({
                name: "expired",
                email: step.email,
                projectId: step.projectId,
                maskedEmail: step.maskedEmail,
              });
            }}
            onResend={() => {
              resend(step);
            }}
            onChangeEmail={() => {
              setStep({ name: "details" });
            }}
            resending={pending}
          />
        ) : null;
      break;

    default:
      content = (
        <DetailsStep
          copy={copy}
          projectIdField={projectIdField}
          help={help}
          headingRef={heading}
          notice={noticeText(step.notice)}
          pending={pending}
          onSubmit={(values) => {
            startTransition(async () => {
              const result = await requestCode(values);
              afterRequest(result, (notice) => {
                setStep({ name: "details", notice });
              });
            });
          }}
        />
      );
  }

  return (
    <div
      data-state={step.name === "signedIn" ? "leaving" : undefined}
      className="transition-opacity duration-(--duration-fast) ease-exit data-[state=leaving]:opacity-0"
    >
      {content}
    </div>
  );
}

function StepIntro({
  headingRef,
  eyebrow,
  title,
  intro,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-md lg:gap-lg">
      <div className="flex flex-col gap-md lg:gap-3">
        <p className="hidden text-overline text-action-secondary lg:block lg:text-[13px]">
          {eyebrow}
        </p>
        {/* Figma: Bold 24 / 36, line height 1.1, tracking -1.5%. */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[24px] leading-[1.1] font-bold tracking-[-0.01em] text-text-primary outline-none lg:text-[36px] lg:tracking-[-0.015em]"
        >
          {title}
        </h1>
        <p className="text-[15px] leading-[1.5] text-text-muted lg:text-body">
          {intro}
        </p>
      </div>
      {children}
    </div>
  );
}

function Notice({ id, text }: { id: string; text: string | undefined }) {
  return (
    <div aria-live="polite" id={id}>
      {text ? (
        <p className="flex items-start gap-2.5 rounded-md bg-action-primary-subtle px-md py-3 text-small text-text-error">
          <CircleAlert
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          <span>{text}</span>
        </p>
      ) : null}
    </div>
  );
}

function ActionLine({
  prompt,
  action,
  onAction,
}: {
  prompt: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-small text-text-muted">
      {prompt ? <span>{prompt}</span> : null}
      <button
        type="button"
        onClick={onAction}
        className="touch-target cursor-pointer font-medium text-action-primary-hover underline-offset-2 hover:underline"
      >
        {action}
      </button>
    </p>
  );
}

function DetailsStep({
  copy,
  projectIdField,
  help,
  headingRef,
  notice,
  pending,
  onSubmit,
}: {
  copy: FlowCopy;
  projectIdField: ProjectIdField | undefined;
  help: ReactNode;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  notice: string | undefined;
  pending: boolean;
  onSubmit: (values: Details) => void;
}) {
  const id = useId();
  const [errors, setErrors] = useState<
    Partial<Record<"email" | "projectId", SignInErrorKey>>
  >({});

  return (
    <StepIntro
      headingRef={headingRef}
      eyebrow={copy.eyebrow}
      title={copy.title}
      intro={copy.intro}
    >
      <form
        noValidate
        className="flex flex-col gap-md lg:gap-lg"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const values: Details = {
            email: textField(data, "email"),
            projectId: projectIdField ? textField(data, "projectId") : null,
          };
          const found = checkDetails(values);
          if (found.email || found.projectId) {
            setErrors(found);
            return;
          }
          setErrors({});
          onSubmit(values);
        }}
      >
        <Notice id={`${id}-notice`} text={notice} />
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-md">
          <div className="flex flex-col gap-sm">
            <Label htmlFor={`${id}-email`}>{copy.email}</Label>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={copy.emailPlaceholder}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
            />
            {errors.email ? (
              <FieldError id={`${id}-email-error`}>
                {copy.errors[errors.email]}
              </FieldError>
            ) : null}
          </div>
          {projectIdField ? (
            <div className="flex flex-col gap-sm">
              <Label htmlFor={`${id}-project`}>{projectIdField.label}</Label>
              <Input
                id={`${id}-project`}
                name="projectId"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={projectIdField.placeholder}
                aria-invalid={errors.projectId ? true : undefined}
                aria-describedby={cn(
                  `${id}-project-hint`,
                  errors.projectId && `${id}-project-error`,
                )}
              />
              {errors.projectId ? (
                <FieldError id={`${id}-project-error`}>
                  {copy.errors[errors.projectId]}
                </FieldError>
              ) : null}
              <p
                id={`${id}-project-hint`}
                className="text-[13px] text-text-muted"
              >
                {projectIdField.hint}
              </p>
            </div>
          ) : null}
        </fieldset>
        <Button type="submit" showIcon loading={pending} className="w-full">
          {pending ? copy.sending : copy.send}
        </Button>
        <p className="hidden text-[13px] text-text-muted lg:block">
          {copy.sendNote}
        </p>
        <p className="flex flex-wrap gap-x-1 text-small text-text-muted lg:pt-2">
          {help}
        </p>
      </form>
    </StepIntro>
  );
}

function CodeStep({
  step,
  copy,
  verifyCode,
  headingRef,
  onSignedIn,
  onExpired,
  onLocked,
  onResend,
  onChangeEmail,
  resending,
}: {
  step: Extract<Step, { name: "code" }>;
  copy: FlowCopy;
  verifyCode: (
    details: Details & { code: string },
  ) => Promise<VerifyCodeResult>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onSignedIn: (projectId: string | null) => void;
  onExpired: (notice?: Notice) => void;
  onLocked: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  resending: boolean;
}) {
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(step.error);
  const [shakes, setShakes] = useState(0);
  const [success, setSuccess] = useState(false);
  const [checking, startChecking] = useTransition();
  const secondsLeft = useCountdown(step.resendAt);

  // Guards against a second submit before React re-renders (Enter plus auto-submit).
  const inFlight = useRef(false);

  const submit = (value: string) => {
    if (inFlight.current || checking || success) return;
    if (!/^\d{6}$/.test(value)) {
      setError(copy.errors.codeInvalid);
      return;
    }
    inFlight.current = true;
    startChecking(async () => {
      const result = await verifyCode({
        email: step.email,
        projectId: step.projectId,
        code: value,
      });
      // Free for the next attempt, except after success (the hand-off is running).
      inFlight.current = result.status === "signed_in";
      switch (result.status) {
        case "signed_in":
          setError(undefined);
          setSuccess(true);
          onSignedIn(result.projectId);
          return;
        case "wrong_code":
          setCode("");
          setShakes((count) => count + 1);
          setError(
            result.triesLeft === 1
              ? copy.codeWrongOne
              : fill(copy.codeWrongOther, { tries: result.triesLeft }),
          );
          return;
        case "invalid":
          setError(copy.errors.codeInvalid);
          return;
        case "expired":
          onExpired();
          return;
        case "locked":
          onLocked();
          return;
        default:
          setError(copy.failed);
      }
    });
  };

  return (
    <StepIntro
      headingRef={headingRef}
      eyebrow={copy.eyebrow}
      title={copy.codeTitle}
      intro={fill(copy.codeIntro, { email: step.maskedEmail })}
    >
      <form
        noValidate
        className="flex flex-col gap-md lg:gap-lg"
        onSubmit={(event) => {
          event.preventDefault();
          // The field's hidden input holds the code even before React re-renders.
          const submitted = textField(
            new FormData(event.currentTarget),
            "code",
          );
          submit(submitted || code);
        }}
      >
        <div className="flex flex-col gap-sm">
          <CodeInput
            value={code}
            onValueChange={(value) => {
              setCode(value);
              if (error) setError(undefined);
            }}
            label={copy.codeLabel}
            status={success ? "success" : error ? "error" : "idle"}
            shakeKey={shakes}
            describedBy={error ? `${id}-code-error` : undefined}
            disabled={checking || success}
          />
          <div aria-live="polite">
            {error ? (
              <FieldError id={`${id}-code-error`}>{error}</FieldError>
            ) : null}
            {!error && step.resent ? (
              <p className="text-small text-text-muted">{copy.codeSentAgain}</p>
            ) : null}
          </div>
        </div>
        <Button
          type="submit"
          showIcon
          loading={checking || success}
          className="w-full"
        >
          {checking ? copy.codeChecking : copy.codeSubmit}
        </Button>
        {secondsLeft > 0 ? (
          <p className="text-small text-text-muted">
            {copy.resendWait}{" "}
            <span className="font-medium text-text-primary tabular-nums">
              {formatCountdown(secondsLeft)}
            </span>
          </p>
        ) : (
          <ActionLine
            prompt={copy.resendPrompt}
            action={resending ? copy.sending : copy.resendAction}
            onAction={onResend}
          />
        )}
        <div className="lg:pt-2">
          <ActionLine
            prompt={copy.wrongAddress}
            action={copy.useDifferentEmail}
            onAction={onChangeEmail}
          />
        </div>
      </form>
    </StepIntro>
  );
}

/** A text field from a submitted form (FormData values can also be files). */
function textField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

function formatCountdown(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}
