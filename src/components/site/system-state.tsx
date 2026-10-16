import type { ReactNode, Ref } from "react";

/*
 * The system-state layout from the designed 404 (Figma 08 — System / States: desktop
 * 320:3, tablet 380:77, mobile 380:129): a decorative visual, one H1, a lead and the
 * actions, centred. The 404 and the newsletter link pages (#41) share it; Figma has no
 * frames for the latter, so they follow this one (docs/tech-debt.md).
 * - `titleRef`: pages whose state changes move focus to the H1 (it is focusable).
 * - `children`: extra content below the actions, e.g. the Newsletter card.
 */
export function SystemState({
  visual,
  title,
  titleRef,
  lead,
  actions,
  children,
}: {
  visual: ReactNode;
  title: ReactNode;
  titleRef?: Ref<HTMLHeadingElement>;
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex flex-1 flex-col items-center justify-center gap-lg bg-bg-surface px-(--gutter) pt-12 pb-20 text-center md:gap-xl md:pt-16 lg:pt-17"
    >
      {visual}
      <h1
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className="text-h1 text-text-primary outline-none lg:max-w-200"
      >
        {title}
      </h1>
      {lead ? (
        <p className="max-w-140 text-body [overflow-wrap:anywhere] text-text-muted md:text-lead">
          {lead}
        </p>
      ) : null}
      {actions ? (
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-md">
          {actions}
        </div>
      ) : null}
      {children}
    </main>
  );
}
