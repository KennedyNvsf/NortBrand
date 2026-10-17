import Image from "next/image";
import { Check } from "lucide-react";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { ComponentProps } from "react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { sanityImageProps, type SanityImage } from "@/lib/sanity/image";

import { headingIds } from "../table-of-contents";

/*
 * A post's body, rendered through an explicit component map (nb-se 2.1: never raw
 * HTML). Only what the schema allows has a renderer; anything else renders nothing.
 * - h2/h3 get ids shared with the table of contents (table-of-contents.ts), and a scroll
 *   margin so the sticky nav does not cover them.
 * - Links: same-site paths stay relative; external links open in the same tab with
 *   rel="noopener noreferrer". The schema only allows https, mailto and relative URLs.
 * - Images: next/image from the Sanity CDN, alt text required by the schema, optional
 *   caption.
 * Styles follow Figma 05 Blog › Post › Article Body (285:53; mobile 372:795):
 * - The first paragraph is the lead (Medium 22, text/primary), then 18 px body copy.
 * - Quote: the pull quote with its red bar; bold words inside it turn red ("They
 *   <strong>use them</strong>." in Studio gives Figma's red "use them").
 * - Bullets: the red-check list (Figma "Checklist"); numbered lists stay numbered.
 */

type BodyImage = SanityImage & { _type: "image"; caption?: string | null };

const PARAGRAPH = "text-[18px] leading-[1.7] text-text-muted";
const LEAD =
  "text-[20px] leading-[1.55] font-medium text-text-primary lg:text-[22px]";

function components(
  ids: Map<string, string>,
  { lead = false } = {},
): PortableTextComponents {
  const id = (value: { _key?: string }) =>
    value._key ? ids.get(value._key) : undefined;
  return {
    block: {
      normal: ({ children }) => (
        <p className={lead ? LEAD : PARAGRAPH}>{children}</p>
      ),
      h2: ({ children, value }) => (
        <h2
          id={id(value)}
          className="scroll-mt-30 pt-2 text-[28px] leading-[1.18] font-bold tracking-[-0.005em] text-text-primary md:pt-5 md:text-[32px]"
        >
          {children}
        </h2>
      ),
      h3: ({ children, value }) => (
        <h3
          id={id(value)}
          className="scroll-mt-30 text-h4 font-semibold text-text-primary"
        >
          {children}
        </h3>
      ),
      blockquote: ({ children }) => (
        <blockquote className="flex gap-lg pt-2 pb-5 md:py-5">
          <span
            aria-hidden
            className="w-1 shrink-0 self-stretch rounded-full bg-action-primary"
          />
          <p className="text-[28px] leading-[1.2] font-semibold tracking-[-0.005em] text-text-primary italic lg:text-[38px] [&_strong]:text-action-primary">
            {children}
          </p>
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="flex flex-col gap-md">{children}</ul>
      ),
      number: ({ children }) => (
        <ol
          className={`flex list-decimal flex-col gap-3 pl-5 marker:text-action-primary ${PARAGRAPH}`}
        >
          {children}
        </ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => (
        <li className="flex items-start gap-3">
          <Check
            className="size-6 shrink-0 text-action-primary"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          <span className="text-[18px] leading-[1.35] font-medium text-text-primary lg:text-[19px]">
            {children}
          </span>
        </li>
      ),
      number: ({ children }) => <li className="pl-1">{children}</li>,
    },
    marks: {
      strong: ({ children }) => (
        <strong className="font-semibold text-text-primary">{children}</strong>
      ),
      em: ({ children }) => <em>{children}</em>,
      link: ({
        children,
        value,
      }: {
        children: React.ReactNode;
        value?: { href?: string };
      }) => {
        const href = value?.href ?? "";
        const external = /^https?:/i.test(href);
        return (
          <a
            href={href}
            {...(external && { rel: "noopener noreferrer" })}
            className="font-medium text-text-accent underline underline-offset-2"
          >
            {children}
          </a>
        );
      },
    },
    types: {
      image: ({ value }: { value: BodyImage }) => {
        const props = sanityImageProps(value, { width: 1360, aspect: 16 / 9 });
        if (!props) return null;
        return (
          <figure className="flex flex-col gap-sm">
            <Image
              {...props}
              alt={props.alt}
              sizes="(min-width: 1024px) 680px, 100vw"
              className="h-auto w-full rounded-lg"
            />
            {value.caption ? (
              <figcaption className="text-caption text-text-muted">
                {value.caption}
              </figcaption>
            ) : null}
          </figure>
        );
      },
    },
    // Unknown block types and marks render nothing rather than raw data.
    unknownType: () => null,
    unknownBlockStyle: ({ children }) => (
      <p className={PARAGRAPH}>{children}</p>
    ),
  };
}

/** Blocks and the schema's custom types (images), as the post query returns them. */
type Body = Extract<ComponentProps<typeof PortableText>["value"], unknown[]>;

/** A plain opening paragraph (not a heading, quote or list item) is the lead. */
function isLead(block: Body[number] | undefined) {
  return (
    block?._type === "block" &&
    "style" in block &&
    block.style === "normal" &&
    !("listItem" in block && block.listItem)
  );
}

export function PostBody({
  body,
  className,
}: {
  body: Body | null | undefined;
  className?: string;
}) {
  if (!body?.length) return null;
  const ids = headingIds(body);
  const [first, ...rest] = body;
  const lead = isLead(first) ? [first] : [];
  return (
    <div className={cn("flex flex-col gap-5 md:gap-lg", className)}>
      {lead.length ? (
        <PortableText
          value={lead}
          components={components(ids, { lead: true })}
        />
      ) : null}
      <PortableText
        value={lead.length ? rest : body}
        components={components(ids)}
      />
    </div>
  );
}
