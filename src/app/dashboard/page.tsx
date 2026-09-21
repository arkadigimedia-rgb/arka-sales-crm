import { pageActor } from "@/server/auth";
import { DemoDashboard } from "@/components/demo-dashboard";
export default async function Page(){const user=await pageActor();return <DemoDashboard name={user.name}/>}
