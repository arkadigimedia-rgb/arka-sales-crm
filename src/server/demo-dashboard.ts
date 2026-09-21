import fs from "node:fs";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";
if (fs.existsSync(".env.local")) loadEnvFile(".env.local");
else if (fs.existsSync(".env")) loadEnvFile(".env");
let poolInstance: Pool | null = null;
function getPool() {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return poolInstance;
}
export async function demoDashboard(){const c=await getPool().connect();try{const q=async(s:string)=> (await c.query(s)).rows;const [pipeline,contactability,scores,locations,activity,attention,meetings,recent]=await Promise.all([q("select status,count(*)::int as count from demo_lead_states group by status"),q("select outcome,count(*)::int as count from calls where is_demo=true group by outcome"),q("select case when score<=20 then '0–20' when score<=40 then '21–40' when score<=60 then '41–60' when score<=80 then '61–80' else '81–100' end as bucket,count(*)::int as count from leads group by bucket"),q("select coalesce(location,'Unknown') as label,count(*)::int as count from leads group by label order by count desc limit 6"),q("select to_char(created_at,'Mon DD') as label,count(*)::int as count from activities where is_demo=true and created_at>=now()-interval '14 days' group by label order by min(created_at)"),q("select (select count(*)::int from follow_ups where is_demo=true and status='UPCOMING' and due_at<now()) as overdue,(select count(*)::int from demo_lead_states where next_action is null) as no_action,(select count(*)::int from proposals where is_demo=true and status in ('SENT','VIEWED')) as proposals"),q("select m.id,l.company_name as company,m.starts_at,m.type,m.status from meetings m join leads l on l.id=m.lead_id where m.is_demo=true and m.starts_at>=date_trunc('day',now()) order by m.starts_at limit 6"),q("select a.id,l.company_name as company,a.description,a.created_at from activities a join leads l on l.id=a.lead_id where a.is_demo=true order by a.created_at desc limit 8")]);return {pipeline,contactability,scores,locations,activity,attention:attention[0],meetings,recent};}finally{c.release();}}
