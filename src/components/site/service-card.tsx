import type { ComponentProps } from "react";

import { LINK_ROOT, TextLinkContent } from "@/components/site/text-link";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE, icons, type IconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Service Card (398:194). State: Default / Hover / Pressed /
 * Focus. Server component (Handoff); padding 24 on touch, 32 on desktop; title wraps.
 * - The whole card is one interactive element: a link when `href` is given, otherwise a
 *   button (the Services page wraps it in a Dialog/Drawer trigger, which passes its
 *   props through). "Learn More" is a visual label, not a nested link.
 * - Hover deepens the shadow, pressed sinks to bg/primary with a flat shadow, and focus
 *   uses the global 2 px ring with 2 px offset, which follows the card radius.
 * - Because buttons may only contain phrasing content, the title is a styled span, not
 *   a heading; the card's accessible name is its full text.
 */

type ServiceCardContentProps = {
  icon: IconName;
  title: string;
  description: string;
  actionLabel: string;
};

type ServiceCardLinkProps = ServiceCardContentProps &
  Omit<ComponentProps<typeof Link>, "children" | "title">;

type ServiceCardButtonProps = ServiceCardContentProps &
  Omit<ComponentProps<"button">, "children" | "title"> & { href?: never };

type ServiceCardProps = ServiceCardLinkProps | ServiceCardButtonProps;

const cardClassName = cn(
  LINK_ROOT,
  "flex w-full cursor-pointer flex-col items-start justify-between gap-md text-left",
  "rounded-lg border border-border-default bg-bg-surface p-lg shadow-card lg:p-xl",
  "transition-[box-shadow,background-color] duration-(--duration-base) ease-standard",
  "hover:shadow-card-hover active:bg-bg-primary active:shadow-card-pressed",
);

function ServiceCardContent({
  icon,
  title,
  description,
  actionLabel,
}: ServiceCardContentProps) {
  const Icon = icons[icon];
  return (
    <>
      <span className="flex w-full flex-col gap-md">
        <span className="flex w-full items-center gap-md">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-action-primary-subtle">
            <Icon
              className="size-6 text-action-primary"
              strokeWidth={ICON_STROKE}
              aria-hidden
            />
          </span>
          <span className="min-w-0 flex-1 text-h4 font-semibold text-text-primary">
            {title}
          </span>
        </span>
        <span className="text-small text-text-muted">{description}</span>
      </span>
      <TextLinkContent>{actionLabel}</TextLinkContent>
    </>
  );
}

function ServiceCard(props: ServiceCardProps) {
  if (props.href !== undefined) {
    const { icon, title, description, actionLabel, className, ...linkProps } =
      props;
    return (
      <Link
        data-slot="service-card"
        className={cn(cardClassName, className)}
        {...linkProps}
      >
        <ServiceCardContent
          icon={icon}
          title={title}
          description={description}
          actionLabel={actionLabel}
        />
      </Link>
    );
  }

  const {
    icon,
    title,
    description,
    actionLabel,
    className,
    type = "button",
    ...buttonProps
  } = props;
  return (
    <button
      data-slot="service-card"
      type={type}
      className={cn(cardClassName, className)}
      {...buttonProps}
    >
      <ServiceCardContent
        icon={icon}
        title={title}
        description={description}
        actionLabel={actionLabel}
      />
    </button>
  );
}

export { ServiceCard, type ServiceCardProps };
