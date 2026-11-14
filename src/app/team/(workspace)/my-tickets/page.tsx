import type { Metadata } from "next";

import { teamPagesCopy } from "@/features/portal/team/copy";
import { EmptyState } from "@/features/portal/states/empty-state";

/* My tickets (#133 shell; content in the My tickets / Team / Settings ticket, #142). */

export const metadata: Metadata = { title: teamPagesCopy.myTickets.title };

export default function MyTicketsPage() {
  const copy = teamPagesCopy.myTickets;
  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h3 text-text-primary">{copy.title}</h1>
      <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
    </div>
  );
}
