import { pageActor } from "@/server/auth";
import { getDashboard } from "@/server/dashboard";
import { LiveDashboard } from "@/components/live-dashboard";

export default async function DashboardPage() {
  const user = await pageActor();
  const data = await getDashboard(user);

  return (
    <LiveDashboard
      userName={user.name}
      userRole={user.role}
      initialData={data}
    />
  );
}
