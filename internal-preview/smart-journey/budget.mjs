// Reserve worst-case request cost before sending a request, without relying on free allowances.
// The same SQL works with the local SQLite adapter and a future atomic D1 implementation.
export const GOOGLE_BUDGET_MILLI_USD = 4000; // $4 request guard; $1 buffer under owner's $5 ceiling.
export const GOOGLE_REQUEST_COST = Object.freeze({ map:7, route:10 });
export const GOOGLE_MONTHLY_LIMITS = Object.freeze({ map:200, route:200 });
export const GOOGLE_DAILY_LIMITS = Object.freeze({ map:10, route:10 });

export const budgetSchema = `CREATE TABLE IF NOT EXISTS journey_google_budget (
  month TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0,
  reserved_milli_usd INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(month,day,kind));`;

export function reserveStatement(kind,now=new Date()) {
  if(!Object.hasOwn(GOOGLE_REQUEST_COST,kind))throw new Error('unsupported_budget_kind');
  const day=now.toISOString().slice(0,10),month=day.slice(0,7),cost=GOOGLE_REQUEST_COST[kind];
  return { sql:`INSERT INTO journey_google_budget (month,day,kind,requests,reserved_milli_usd)
    SELECT ?,?,?,1,? WHERE
      COALESCE((SELECT SUM(reserved_milli_usd) FROM journey_google_budget WHERE month=?),0)+?<=?
      AND COALESCE((SELECT SUM(requests) FROM journey_google_budget WHERE month=? AND kind=?),0)<?
      AND COALESCE((SELECT requests FROM journey_google_budget WHERE month=? AND day=? AND kind=?),0)<?
    ON CONFLICT(month,day,kind) DO UPDATE SET requests=requests+1,reserved_milli_usd=reserved_milli_usd+excluded.reserved_milli_usd`,
    args:[month,day,kind,cost,month,cost,GOOGLE_BUDGET_MILLI_USD,month,kind,GOOGLE_MONTHLY_LIMITS[kind],month,day,kind,GOOGLE_DAILY_LIMITS[kind]] };
}

export function d1Budget(db) {
  if(!db)return null;
  return {reserve:async kind=>{try{const {sql,args}=reserveStatement(kind);const result=await db.prepare(sql).bind(...args).run();return result.success===true&&result.meta?.changes===1;}catch{return false;}}};
}

export function googleControlsReady(env,budget) {
  return env.GOOGLE_MAPS_BILLING_APPROVED==='true' && env.GOOGLE_KEY_RESTRICTIONS_VERIFIED==='true' &&
    env.GOOGLE_PROVIDER_QUOTAS_VERIFIED==='true' && typeof budget?.reserve==='function';
}
