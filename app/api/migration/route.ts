import { Client } from "pg";
import * as XLSX from "xlsx";
import { createHash, timingSafeEqual } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type R = Record<string, any>;
const date = (v:any) => v == null || v === "" ? null : v instanceof Date ? v.toISOString() : v;
const num = (v:any, fallback:any=null) => v == null || v === "" ? fallback : Number(v);
const int = (v:any) => v == null || v === "" ? null : Math.trunc(Number(v));
const bool = (v:any) => v == null || v === "" ? false : typeof v === "string" ? !["false","0","no"].includes(v.toLowerCase()) : Boolean(v);
const ident = (s:string) => `"${s.replaceAll('"','""')}"`;
function previewOnly(){return process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF==="neon-backend-migration";}
function prepare(buf:Buffer) {
  const wb=XLSX.read(buf,{type:"buffer",cellDates:true});
  const rows=(name:string):R[]=>{const s=wb.Sheets[name];if(!s)throw Error(`Missing worksheet: ${name}`);return XLSX.utils.sheet_to_json<R>(s,{defval:null,raw:true}).filter(r=>Object.values(r).some(v=>v!==null&&v!==""));};
  const n=(name:string)=>rows(name).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,date(v)])));
  const users=n("Users").map(r=>({user_id:r.user_id,email:r.email,full_name:r.full_name,branch:r.branch,password_hash:r.password_hash,salt:r.salt,role:r.role||"participant",status:r.status||"active",created_at:date(r.created_at),last_login:date(r.last_login),username:r.username,position:r.position,excluded_from_reporting:bool(r.excluded_from_reporting)}));
  const courses=n("Courses").map(r=>({course_id:r.course_id,title:r.title,description:r.description,category:r.category,passing_score:num(r.passing_score),time_limit_min:int(r.time_limit_min),start_at:date(r.start_at),end_at:date(r.end_at),status:r.status||"draft",created_by:r.created_by,created_at:date(r.created_at),updated_at:date(r.updated_at),attempt_limit:int(r.attempt_limit),randomize_answers:bool(r.randomize_answers)}));
  const lessons=n("Lessons").map(r=>({lesson_id:r.lesson_id,title:r.title,summary:r.summary,content:r.content,category:r.category,duration_min:int(r.duration_min),resource_title:r.resource_title,resource_url:r.resource_url,status:r.status||"draft",created_by:r.created_by,created_at:date(r.created_at),updated_at:date(r.updated_at)}));
  const questions=n("Questions").map(r=>({question_id:r.question_id,course_id:r.course_id,order_no:int(r.order_no)||0,question_text:r.question_text,option_a:r.option_a,option_b:r.option_b,option_c:r.option_c,option_d:r.option_d,correct_option:r.correct_option,points:num(r.points,1),explanation:r.explanation,is_archived_placeholder:false}));
  const attempts=n("Attempts").map(r=>({attempt_id:r.attempt_id,course_id:r.course_id,user_id:r.user_id,started_at:date(r.started_at),submitted_at:date(r.submitted_at),status:r.status||"in_progress",score:num(r.score),correct_count:int(r.correct_count),total_questions:int(r.total_questions),duration_seconds:int(r.duration_seconds),answers_json:r.answers_json==null||r.answers_json===""?{}:typeof r.answers_json==="string"?JSON.parse(r.answers_json):r.answers_json}));
  const answers=n("Answers").map(r=>({answer_id:r.answer_id,attempt_id:r.attempt_id,question_id:r.question_id,selected_option:r.selected_option,is_correct:r.is_correct==null?null:bool(r.is_correct),points_awarded:num(r.points_awarded,0),answered_at:date(r.answered_at)}));
  const sessions=n("Sessions").map(r=>({token_hash:r.token_hash,user_id:r.user_id,role:r.role,expires_at:date(r.expires_at),created_at:date(r.created_at)}));
  const settings=n("Settings").map(r=>({key:r.key,value:r.value==null?null:String(r.value),updated_at:date(r.updated_at)}));
  const live=n("LiveActivity").map(r=>({attempt_id:r.attempt_id,course_id:r.course_id,user_id:r.user_id,current_question:int(r.current_question)||0,total_questions:int(r.total_questions)||0,answered_count:int(r.answered_count)||0,client_status:r.client_status||"active",last_activity_at:date(r.last_activity_at),updated_at:date(r.updated_at)}));
  const unique=(a:R[],k:string)=>{const ids=a.map(x=>x[k]);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error(`Missing/duplicate ${k}`);};
  unique(users,"user_id");unique(courses,"course_id");unique(lessons,"lesson_id");unique(questions,"question_id");unique(attempts,"attempt_id");unique(answers,"answer_id");
  const u=new Set(users.map(x=>String(x.user_id))),c=new Set(courses.map(x=>String(x.course_id))),a=new Set(attempts.map(x=>String(x.attempt_id)));
  for(const x of courses)if(x.created_by&&!u.has(String(x.created_by)))throw Error("Course creator is missing from Users");
  for(const x of attempts)if(!u.has(String(x.user_id))||!c.has(String(x.course_id)))throw Error("Attempt has a missing user or course");
  for(const x of answers)if(!a.has(String(x.attempt_id)))throw Error("Answer has a missing attempt");
  const q=new Set(questions.map(x=>String(x.question_id))),byAttempt=new Map(attempts.map(x=>[String(x.attempt_id),x])),missing=new Map<string,string>();
  for(const x of answers)if(!q.has(String(x.question_id))){const at=byAttempt.get(String(x.attempt_id));if(!at)throw Error("Answer references an unknown attempt");const cid=String(at.course_id),qid=String(x.question_id);if(missing.has(qid)&&missing.get(qid)!==cid)throw Error("Archived question is linked to multiple courses");missing.set(qid,cid);}
  const placeholders=[...missing].map(([question_id,course_id],i)=>({question_id,course_id,order_no:900000+i,question_text:"[Archived question — original text was not present in the workbook export]",option_a:null,option_b:null,option_c:null,option_d:null,correct_option:null,points:1,explanation:null,is_archived_placeholder:true}));
  const jobs:[string,R[]][]=[["users",users],["courses",courses],["lessons",lessons],["questions",[...questions,...placeholders]],["attempts",attempts],["answers",answers],["sessions",sessions],["app_settings",settings],["live_activity",live]];
  const source={users:users.length,courses:courses.length,lessons:lessons.length,questions:questions.length,attempts:attempts.length,answers:answers.length,sessions:sessions.length,app_settings:settings.length,live_activity:live.length};
  return {jobs,source,placeholders:placeholders.length};
}
async function insert(client:Client,table:string,rows:R[]) {
  if(!rows.length)return;const cols=Object.keys(rows[0]);
  for(let i=0;i<rows.length;i+=100){const batch=rows.slice(i,i+100),values:any[]=[];const tuples=batch.map((r,j)=>`(${cols.map((k,c)=>{values.push(r[k]??null);return `$${j*cols.length+c+1}`;}).join(",")})`);
    await client.query(`INSERT INTO public.${ident(table)} (${cols.map(ident).join(",")}) VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING`,values);}
}
export async function PUT(req:Request) {
  if(!previewOnly())return Response.json({ok:false,error:"Not found."},{status:404});
  if(!process.env.DATABASE_URL)return Response.json({ok:false,error:"Preview database is not configured."},{status:503});
  let client:Client|undefined;
  try {
    const body=await req.json() as {pepper?:string;username?:string;password?:string};
    if(typeof body.pepper!=="string"||!body.pepper||typeof body.username!=="string"||!body.username||typeof body.password!=="string"||!body.password)return Response.json({ok:false,error:"Enter the pepper, username and password."},{status:400});
    if(body.pepper.length>2048||body.password.length>1024)return Response.json({ok:false,error:"Input is too long."},{status:400});
    client=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000,statement_timeout:10000});await client.connect();
    const found=await client.query("SELECT salt,password_hash FROM public.users WHERE lower(username)=lower($1) AND status='active' LIMIT 1",[body.username]);
    if(!found.rowCount)return Response.json({ok:false,error:"Account not found or inactive."},{status:401});
    const {salt,password_hash}=found.rows[0];
    const digest=createHash("sha256").update(String(salt)+"|"+body.password+"|"+body.pepper,"utf8").digest("hex");
    const expected=String(password_hash??"");
    const valid=/^[a-f0-9]{64}$/i.test(expected)&&timingSafeEqual(Buffer.from(digest,"hex"),Buffer.from(expected,"hex"));
    if(!valid)return Response.json({ok:false,error:"The pepper and account credentials did not match. No data was changed."},{status:401});
    return Response.json({ok:true,message:"Legacy password hash verified. No credentials or secrets were changed or stored."},{headers:{"cache-control":"no-store"}});
  } catch {return Response.json({ok:false,error:"Could not verify the credentials. No data was changed."},{status:400,headers:{"cache-control":"no-store"}});}
  finally {if(client)await client.end().catch(()=>{});}
}
export async function POST(req:Request) {
  if(!previewOnly())return Response.json({ok:false},{status:404});
  if(!process.env.DATABASE_URL)return Response.json({ok:false,error:"Preview database is not configured."},{status:503});
  let client:Client|undefined;
  try {
    const form=await req.formData(),file=form.get("file"),mode=form.get("mode");
    if(!(file instanceof File)||!file.name.toLowerCase().endsWith(".xlsx"))return Response.json({ok:false,error:"Choose the original .xlsx workbook."},{status:400});
    if(file.size>4*1024*1024)return Response.json({ok:false,error:"Workbook exceeds 4 MB."},{status:413});
    const data=prepare(Buffer.from(await file.arrayBuffer())),total=Object.values(data.source).reduce((x,y)=>x+y,0)+data.placeholders;
    if(mode==="validate")return Response.json({ok:true,source:data.source,archivedPlaceholders:data.placeholders,totalRows:total,excluded:["Dashboard"],note:"Expired sessions are retained. Missing historical question text is represented by archived placeholders."},{headers:{"cache-control":"no-store"}});
    if(mode!=="import")return Response.json({ok:false,error:"Unknown action."},{status:400});
    client=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:15000,statement_timeout:120000});await client.connect();await client.query("BEGIN");
    const empty=await client.query("SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM courses)+(SELECT count(*) FROM lessons)+(SELECT count(*) FROM questions)+(SELECT count(*) FROM attempts)+(SELECT count(*) FROM answers)+(SELECT count(*) FROM sessions)+(SELECT count(*) FROM app_settings)+(SELECT count(*) FROM live_activity) AS total");
    if(Number(empty.rows[0].total)!==0)throw Error("Migration database is not empty. Import stopped to protect existing data.");
    await client.query("ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_archived_placeholder boolean NOT NULL DEFAULT false");
    for(const [table,rows] of data.jobs)await insert(client,table,rows);
    const check=await client.query("SELECT (SELECT count(*)::int FROM users) users,(SELECT count(*)::int FROM courses) courses,(SELECT count(*)::int FROM lessons) lessons,(SELECT count(*)::int FROM questions) questions,(SELECT count(*)::int FROM questions WHERE is_archived_placeholder) archived_placeholders,(SELECT count(*)::int FROM attempts) attempts,(SELECT count(*)::int FROM answers) answers,(SELECT count(*)::int FROM sessions) sessions,(SELECT count(*)::int FROM app_settings) app_settings,(SELECT count(*)::int FROM live_activity) live_activity,(SELECT count(*)::int FROM answers a LEFT JOIN questions q USING(question_id) WHERE q.question_id IS NULL) orphaned_answers");
    const db=check.rows[0];if(Number(db.orphaned_answers)!==0)throw Error("Integrity check failed: answers still reference missing questions.");
    for(const [table,rows] of data.jobs)if(Number(db[table])!==rows.length)throw Error(`Row-count check failed for ${table}.`);
    await client.query("COMMIT");return Response.json({ok:true,inserted:data.source,database:db,archivedPlaceholders:data.placeholders,totalRows:total,note:"Dashboard excluded; expired sessions retained; credentials transferred directly to Neon."},{headers:{"cache-control":"no-store"}});
  } catch(e) {if(client)await client.query("ROLLBACK").catch(()=>{});return Response.json({ok:false,error:e instanceof Error?e.message:"Migration failed."},{status:400,headers:{"cache-control":"no-store"}});}
  finally {if(client)await client.end().catch(()=>{});}
}
