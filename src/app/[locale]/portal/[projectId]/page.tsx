import { ClientSectionPage } from "@/features/portal/shell/client-section";

/* Overview (CP-03): the project name as H1; content arrives with #134. */
export default function Page({
  params,
}: PageProps<"/[locale]/portal/[projectId]">) {
  return <ClientSectionPage params={params} section="overview" />;
}
