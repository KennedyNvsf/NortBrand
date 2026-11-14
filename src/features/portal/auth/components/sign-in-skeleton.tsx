/*
 * Shown while the sign-in page checks the session (#131). 14 Portal — Motion › Loading:
 * only after 300 ms, a static skeleton in the final layout, no shimmer, then the form.
 * It has no inputs, so the page never holds two forms while the real one streams in.
 */
export function SignInSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col gap-md lg:gap-lg"
      style={{ animation: "enter-fade var(--duration-fast) linear 300ms both" }}
    >
      <span className="hidden h-4 w-40 rounded-sm bg-bg-primary lg:block" />
      <span className="h-9 w-4/5 rounded-sm bg-bg-primary lg:h-11" />
      <span className="h-12 w-full rounded-sm bg-bg-primary" />
      <span className="h-12 w-full rounded-sm bg-bg-primary lg:h-[38px]" />
      <span className="h-12 w-full rounded-sm bg-bg-primary lg:h-[38px]" />
      <span className="h-11 w-full rounded-md bg-bg-primary" />
    </div>
  );
}
