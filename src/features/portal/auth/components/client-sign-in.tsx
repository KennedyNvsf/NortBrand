"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { requestClientCode, verifyClientCode } from "../actions";
import { checkDetails } from "../client-validation";
import type { SignInErrorKey } from "../schema";
import type { RequestCodeResult } from "../sign-in";
import { CodeInput } from "./code-input";
import { fill, type SignInCopy } from "./copy";

/*
 * Client sign-in (Figma CP-01, CP-02 and the CP-08 states; #131).
 *   details → (code sent) → code → (signed in) → the project
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
type Contact = { email: string; projectId: string; maskedEmail: string };

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

export function ClientSignIn({
  copy,
  locale,
  initiallySignedOut,
}: {
  copy: SignInCopy;
  locale: Locale;
  initiallySignedOut: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>(
    initiallySignedOut ? { name: "signedOut" } : { name: "details" },
  );
  const [pending, startTransition] = useTransition();
  const firstRender = useRef(true);

  // Focus follows the step, but not on page load.
  useEffect(() => {
    if (firstRender.current) {
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
      const result = await requestClientCode({
        email: contact.email,
        projectId: contact.projectId,
        locale,
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
              setStep({ name: "details" });
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
            locale={locale}
            headingRef={heading}
            onSignedIn={(projectId) => {
              setStep({ name: "signedIn" });
              window.setTimeout(() => {
                router.push(`/portal/${projectId}`);
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
          headingRef={heading}
          notice={noticeText(step.notice)}
          pending={pending}
          onSubmit={(values) => {
            startTransition(async () => {
              const result = await requestClientCode({ ...values, locale });
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
  headingRef,
  notice,
  pending,
  onSubmit,
}: {
  copy: SignInCopy;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  notice: string | undefined;
  pending: boolean;
  onSubmit: (values: { email: string; projectId: string }) => void;
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
          const values = {
            email: textField(data, "email"),
            projectId: textField(data, "projectId"),
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
          <div className="flex flex-col gap-sm">
            <Label htmlFor={`${id}-project`}>{copy.projectId}</Label>
            <Input
              id={`${id}-project`}
              name="projectId"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={copy.projectIdPlaceholder}
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
              {copy.projectIdHint}
            </p>
          </div>
        </fieldset>
        <Button type="submit" showIcon loading={pending} className="w-full">
          {pending ? copy.sending : copy.send}
        </Button>
        <p className="hidden text-[13px] text-text-muted lg:block">
          {copy.sendNote}
        </p>
        <p className="flex flex-wrap gap-x-1 text-small text-text-muted lg:pt-2">
          <span>{copy.lostId}</span>
          <Link
            href="/contact"
            className="touch-target font-medium text-action-primary-hover underline-offset-2 hover:underline"
          >
            {copy.contactUs}
          </Link>
        </p>
      </form>
    </StepIntro>
  );
}

function CodeStep({
  step,
  copy,
  locale,
  headingRef,
  onSignedIn,
  onExpired,
  onLocked,
  onResend,
  onChangeEmail,
  resending,
}: {
  step: Extract<Step, { name: "code" }>;
  copy: SignInCopy;
  locale: Locale;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onSignedIn: (projectId: string) => void;
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
      const result = await verifyClientCode({
        email: step.email,
        projectId: step.projectId,
        code: value,
        locale,
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
