import Image from "next/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { ComponentProps } from "react";

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
 *   caption. Prose styles follow the Legal pages until the post design lands (#61).
 */

type BodyImage = SanityImage & { _type: "image"; caption?: string | null };

function components(ids: Map<string, string>): PortableTextComponents {
  const id = (value: { _key?: string }) =>
    value._key ? ids.get(value._key) : undefined;
  return {
    block: {
      normal: ({ children }) => (
        <p className="text-body text-text-muted lg:text-lead">{children}</p>
      ),
      h2: ({ children, value }) => (
        <h2
          id={id(value)}
          className="scroll-mt-28 pt-md text-h3 font-bold tracking-[-0.006em] text-text-primary"
        >
          {children}
        </h2>
      ),
      h3: ({ children, value }) => (
        <h3
          id={id(value)}
          className="scroll-mt-28 text-h4 font-semibold text-text-primary"
        >
          {children}
        </h3>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-action-primary pl-lg text-lead text-text-primary">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="flex list-disc flex-col gap-3 pl-5 text-body text-text-primary marker:text-action-primary lg:text-lead">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-body text-text-primary marker:text-action-primary lg:text-lead">
          {children}
        </ol>
      ),
    },
    listItem: ({ children }) => <li className="pl-1">{children}</li>,
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
      <p className="text-body text-text-muted lg:text-lead">{children}</p>
    ),
  };
}

/** Blocks and the schema's custom types (images), as the post query returns them. */
type Body = Extract<ComponentProps<typeof PortableText>["value"], unknown[]>;

export function PostBody({ body }: { body: Body | null | undefined }) {
  if (!body?.length) return null;
  return (
    <div className="flex flex-col gap-lg">
      <PortableText value={body} components={components(headingIds(body))} />
    </div>
  );
}
