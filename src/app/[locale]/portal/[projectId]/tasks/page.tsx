import { ClientSectionPage } from "@/features/portal/shell/client-section";

export default function Page({
  params,
}: PageProps<"/[locale]/portal/[projectId]/tasks">) {
  return <ClientSectionPage params={params} section="tasks" />;
}
