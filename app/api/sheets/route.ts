import { Client } from "pg";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type Body = Record<string, any>;
const pepper = () => process.env.PASSWORD_PEPPER || "";
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const tokenHash = (token: string) => hash("session|" + token);
const passwordHash = (password: string, salt: string) => hash(String(salt) + "|" + String(password) + "|" + pepper());
const iso = (value: any) => value ? new Date(value).toISOString() : "";
const bool = (value: any) => value === true || ["true", "1", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
const n = (value: any, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const username = (value: any) => String(value ?? "").trim().toLowerCase();
const uid = () => randomUUID();
const clean = (value: any) => String(value ?? "").trim();

async function db<T = Row>(fn: (c: Client) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) throw new Error("Neon database is not configured.");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 12000, statement_timeout: 30000 });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}
function publicUser(u: Row) {
  return { id: u.user_id, username: u.username, email: u.email, fullName: u.full_name, branch: u.branch, position: u.position || "", role: u.role, status: u.status, excludedFromReporting: u.role === "participant" && bool(u.excluded_from_reporting), createdAt: iso(u.created_at), lastLogin: iso(u.last_login) };
}
function lifecycle(c: Row, now = Date.now()) {
  const s = String(c.status || "").toLowerCase();
  if (s === "archived" || s === "draft" || s === "completed") return s;
  if (c.end_at && new Date(c.end_at).getTime() < now) return "completed";
  if (c.start_at && new Date(c.start_at).getTime() > now) return "scheduled";
  return ["live", "upcoming", "scheduled"].includes(s) ? "live" : "draft";
}
function publicCourse(c: Row, count = 0) {
  return { id: c.course_id, title: c.title, description: c.description, category: c.category, passingScore: n(c.passing_score), duration: n(c.time_limit_min), attemptLimit: clamp(Math.floor(n(c.attempt_limit)), 0, 100), randomizeAnswers: bool(c.randomize_answers), createdAt: iso(c.created_at), startAt: iso(c.start_at), endAt: iso(c.end_at), status: lifecycle(c), questionCount: count };
}
function publicLesson(l: Row) {
  return { id: l.lesson_id, title: l.title, summary: l.summary, content: l.content, category: l.category || "General", duration: Math.max(1, n(l.duration_min, 5)), resourceTitle: l.resource_title || "", resourceUrl: l.resource_url || "", status: l.status, createdAt: iso(l.created_at), updatedAt: iso(l.updated_at) };
}
function publicAttempt(a: Row, course?: Row) {
  const score = n(a.score);
  return { id: a.attempt_id, courseId: a.course_id, title: course?.title || "", category: course?.category || "", submittedAt: iso(a.submitted_at), score, correctCount: n(a.correct_count), totalQuestions: n(a.total_questions), durationSeconds: n(a.duration_seconds), passed: score >= n(course?.passing_score) };
}
async function session(c: Client, token: string, role?: string) {
  if (!token) throw new Error("Authentication required.");
  const r = await c.query("SELECT s.*,u.* FROM sessions s JOIN users u USING(user_id) WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active' LIMIT 1", [tokenHash(token)]);
  if (!r.rowCount) throw new Error("Your session has expired. Please sign in again.");
  const u = r.rows[0];
  if (role && u.role !== role) throw new Error("You do not have access to this action.");
  return u;
}
async function lessonsFor(c: Client, admin: boolean) {
  const r = await c.query("SELECT * FROM lessons " + (admin ? "" : "WHERE status='published' ") + "ORDER BY updated_at DESC");
  return r.rows.map(publicLesson);
}
async function questionCounts(c: Client) {
  const r = await c.query("SELECT course_id,count(*)::int AS count FROM questions WHERE is_archived_placeholder=false GROUP BY course_id");
  return Object.fromEntries(r.rows.map(x => [x.course_id, x.count]));
}
async function dashboard(c: Client, user: Row, courseId = "") {
  const [courses, users, attempts, lessons, counts] = await Promise.all([
    c.query("SELECT * FROM courses ORDER BY created_at DESC"),
    c.query("SELECT * FROM users ORDER BY full_name"),
    c.query("SELECT * FROM attempts WHERE status='submitted' ORDER BY submitted_at DESC"),
    lessonsFor(c, true), questionCounts(c)
  ]);
  const userMap = Object.fromEntries(users.rows.map(u => [u.user_id, u]));
  const courseMap = Object.fromEntries(courses.rows.map(x => [x.course_id, x]));
  const reportable = attempts.rows.filter(a => !bool(userMap[a.user_id]?.excluded_from_reporting));
  const filtered = courseId ? reportable.filter(a => a.course_id === courseId) : reportable;
  const stats: Record<string, { people: Set<string>; total: number; count: number }> = {};
  for (const a of reportable) {
    stats[a.course_id] ||= { people: new Set(), total: 0, count: 0 };
    stats[a.course_id].people.add(a.user_id); stats[a.course_id].total += n(a.score); stats[a.course_id].count++;
  }
  const participantStats: Record<string, { count: number; total: number }> = {};
  for (const a of attempts.rows) { participantStats[a.user_id] ||= { count: 0, total: 0 }; participantStats[a.user_id].count++; participantStats[a.user_id].total += n(a.score); }
  const scoreboard = filtered.map(a => {
    const u = userMap[a.user_id] || {}, co = courseMap[a.course_id] || {};
    return { attemptId: a.attempt_id, courseId: a.course_id, courseTitle: co.title || "", participantId: a.user_id, name: u.full_name || "Unknown participant", email: u.email || "", branch: u.branch || "", score: n(a.score), correctCount: n(a.correct_count), totalQuestions: n(a.total_questions), durationSeconds: n(a.duration_seconds), submittedAt: iso(a.submitted_at) };
  }).sort((a,b) => b.score-a.score || a.durationSeconds-b.durationSeconds || new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime()).map((x,i)=>({...x,rank:i+1}));
  return {
    ok:true, user:publicUser(user),
    courses:courses.rows.map(co=>({...publicCourse(co, counts[co.course_id]||0), participants:stats[co.course_id]?.people.size||0, average:stats[co.course_id]?.count?Math.round(stats[co.course_id].total/stats[co.course_id].count):0})),
    lessons, knowledgeCentre:{}, participants:users.rows.filter(u=>u.role==="participant").map(u=>({...publicUser(u),attempts:participantStats[u.user_id]?.count||0,average:participantStats[u.user_id]?.count?Math.round(participantStats[u.user_id].total/participantStats[u.user_id].count):0})),
    admins:users.rows.filter(u=>u.role==="admin").map(publicUser), scoreboard,
    summary:{participants:users.rows.filter(u=>u.role==="participant"&&!bool(u.excluded_from_reporting)).length,submitted:scoreboard.length,average:scoreboard.length?Math.round(scoreboard.reduce((s,x)=>s+x.score,0)/scoreboard.length):0,topScore:scoreboard[0]?.score||0}
  };
}
function position(value: any, role: string) {
  const p = clean(value).replace(/\s+/g," ");
  if (!p || p.length>80) throw new Error("A valid position (maximum 80 characters) is required.");
  if (role==="admin") { if (p.toLowerCase()==="mod") return "MoD"; if (p.toLowerCase()==="cinema manager") return "Cinema Manager"; throw new Error("Administrator position must be MoD or Cinema Manager."); }
  return p.toLowerCase()==="stars" ? "Stars" : p;
}
async function action(c: Client, b: Body) {
  const a = clean(b.action);
  if (a==="health") return {ok:true,ready:true,service:"CGV Knowledge Academy · Neon",now:new Date().toISOString()};
  if (a==="login") {
    const who=username(b.username||b.email), pw=String(b.password||"");
    if(!who||!pw) throw new Error("Username and password are required.");
    if(!pepper()) throw new Error("Legacy password verification is not configured on this Preview deployment.");
    const found=await c.query("SELECT * FROM users WHERE lower(username)=lower($1) OR ($1 LIKE '%@%' AND lower(email)=lower($1)) LIMIT 1",[who]);
    const u=found.rows[0];
    if(!u||u.status!=="active"||!u.salt||!u.password_hash) throw new Error("Invalid username or password.");
    const actual=Buffer.from(passwordHash(pw,u.salt),"hex"), expected=Buffer.from(String(u.password_hash),"hex");
    if(expected.length!==actual.length||!timingSafeEqual(actual,expected)) throw new Error("Invalid username or password.");
    const token=randomBytes(32).toString("hex"), expires=new Date(Date.now()+12*3600000);
    await c.query("BEGIN");
    try { await c.query("UPDATE users SET last_login=now() WHERE user_id=$1",[u.user_id]); await c.query("INSERT INTO sessions(token_hash,user_id,role,expires_at,created_at) VALUES($1,$2,$3,$4,now())",[tokenHash(token),u.user_id,u.role,expires]); await c.query("COMMIT"); } catch(e) { await c.query("ROLLBACK"); throw e; }
    const updated={...u,last_login:new Date()};
    const workspace=u.role==="admin"?await dashboard(c,updated):await participantHome(c,updated);
    return {ok:true,token,expiresAt:expires.toISOString(),user:publicUser(updated),workspace};
  }
  if(a==="logout"){if(b.token)await c.query("DELETE FROM sessions WHERE token_hash=$1",[tokenHash(String(b.token))]);return {ok:true};}
  if(a==="getParticipantHome"){const u=await session(c,b.token,"participant");return participantHome(c,u);}
  if(a==="getKnowledgeCentre"){const u=await session(c,b.token);return {ok:true,user:publicUser(u),lessons:await lessonsFor(c,u.role==="admin"),sync:{}};}
  if(a==="startAttempt"){
    const u=await session(c,b.token,"participant"), cid=clean(b.courseId);
    const cr=await c.query("SELECT * FROM courses WHERE course_id=$1",[cid]), co=cr.rows[0];
    if(!co)throw new Error("This evaluation is not available.");
    const state=lifecycle(co);if(state==="scheduled")throw new Error("This evaluation has not opened yet.");if(state!=="live")throw new Error("This evaluation is not available.");
    const qr=await c.query("SELECT * FROM questions WHERE course_id=$1 AND is_archived_placeholder=false ORDER BY order_no",[cid]);if(!qr.rowCount)throw new Error("This evaluation has no published questions.");
    const existing=await c.query("SELECT * FROM attempts WHERE course_id=$1 AND user_id=$2 AND status='started' ORDER BY started_at DESC LIMIT 1",[cid,u.user_id]);
    let attempt=existing.rows[0];
    if(!attempt){const used=await c.query("SELECT count(*)::int n FROM attempts WHERE course_id=$1 AND user_id=$2 AND status='submitted'",[cid,u.user_id]);const limit=n(co.attempt_limit);if(limit&&used.rows[0].n>=limit)throw new Error("You have reached the attempt limit for this evaluation.");const id=uid();const ins=await c.query("INSERT INTO attempts(attempt_id,course_id,user_id,started_at,status,answers_json) VALUES($1,$2,$3,now(),'started','{}'::jsonb) RETURNING *",[id,cid,u.user_id]);attempt=ins.rows[0];}
    await c.query("INSERT INTO live_activity(attempt_id,course_id,user_id,current_question,total_questions,answered_count,client_status,last_activity_at,updated_at) VALUES($1,$2,$3,0,$4,0,'active',now(),now()) ON CONFLICT(attempt_id) DO UPDATE SET client_status='active',last_activity_at=now(),updated_at=now()",[attempt.attempt_id,cid,u.user_id,qr.rowCount]);
    return {ok:true,attemptId:attempt.attempt_id,startedAt:iso(attempt.started_at),course:publicCourse(co,qr.rowCount),questions:qr.rows.map(q=>({id:q.question_id,order:q.order_no,prompt:q.question_text,options:[{key:"A",text:q.option_a},{key:"B",text:q.option_b},{key:"C",text:q.option_c},{key:"D",text:q.option_d}]}))};
  }
  if(a==="submitAttempt"){
    const u=await session(c,b.token,"participant"), id=clean(b.attemptId);
    const ar=await c.query("SELECT a.*,co.passing_score FROM attempts a JOIN courses co USING(course_id) WHERE attempt_id=$1 AND user_id=$2",[id,u.user_id]);const at=ar.rows[0];if(!at)throw new Error("Attempt not found.");
    if(at.status==="submitted")return {ok:true,alreadySubmitted:true,result:{attemptId:id,score:n(at.score),correctCount:n(at.correct_count),totalQuestions:n(at.total_questions),durationSeconds:n(at.duration_seconds),passed:n(at.score)>=n(at.passing_score),passingScore:n(at.passing_score)}};
    if(at.status!=="started")throw new Error("This attempt cannot be submitted.");
    const qs=await c.query("SELECT * FROM questions WHERE course_id=$1 AND is_archived_placeholder=false ORDER BY order_no",[at.course_id]);if(!qs.rows.length)throw new Error("No questions are configured for this course.");
    const answers=b.answers&&typeof b.answers==="object"?b.answers:{}, now=new Date();let earned=0,total=0,correct=0;const answerMap:Record<string,string>={};
    await c.query("BEGIN");
    try {
      for(const q of qs.rows){const raw=String(answers[q.question_id]||"").toUpperCase();const selected=["A","B","C","D"].includes(raw)?raw:"";const ok=selected===String(q.correct_option||"").toUpperCase();const pts=Math.max(1,n(q.points,1));total+=pts;if(ok){correct++;earned+=pts;}answerMap[q.question_id]=selected;await c.query("INSERT INTO answers(answer_id,attempt_id,question_id,selected_option,is_correct,points_awarded,answered_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(attempt_id,question_id) DO UPDATE SET selected_option=EXCLUDED.selected_option,is_correct=EXCLUDED.is_correct,points_awarded=EXCLUDED.points_awarded,answered_at=EXCLUDED.answered_at",[uid(),id,q.question_id,selected,ok,ok?pts:0,now]);}
      const score=total?Math.round(earned/total*100):0,duration=Math.max(0,Math.round((now.getTime()-new Date(at.started_at).getTime())/1000));
      await c.query("UPDATE attempts SET status='submitted',submitted_at=$2,score=$3,correct_count=$4,total_questions=$5,duration_seconds=$6,answers_json=$7 WHERE attempt_id=$1",[id,now,score,correct,qs.rows.length,duration,JSON.stringify(answerMap)]);
      await c.query("UPDATE live_activity SET client_status='completed',last_activity_at=$2,updated_at=$2 WHERE attempt_id=$1",[id,now]);await c.query("COMMIT");
      return {ok:true,result:{attemptId:id,score,correctCount:correct,totalQuestions:qs.rows.length,durationSeconds:duration,passed:score>=n(at.passing_score),passingScore:n(at.passing_score)}};
    }catch(e){await c.query("ROLLBACK");throw e;}
  }
  if(a==="updateAttemptActivity"){
    const u=await session(c,b.token,"participant"),id=clean(b.attemptId);
    const r=await c.query("SELECT a.*,co.course_id FROM attempts a JOIN courses co USING(course_id) WHERE attempt_id=$1 AND user_id=$2 AND status='started'",[id,u.user_id]);if(!r.rowCount)throw new Error("Attempt not found.");
    await c.query("INSERT INTO live_activity(attempt_id,course_id,user_id,current_question,total_questions,answered_count,client_status,last_activity_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT(attempt_id) DO UPDATE SET current_question=EXCLUDED.current_question,total_questions=EXCLUDED.total_questions,answered_count=EXCLUDED.answered_count,client_status=EXCLUDED.client_status,last_activity_at=now(),updated_at=now()",[id,r.rows[0].course_id,u.user_id,Math.max(0,Math.floor(n(b.currentQuestion))),Math.max(0,Math.floor(n(b.totalQuestions))),Math.max(0,Math.floor(n(b.answeredCount))),clean(b.status)||"active"]);return {ok:true};
  }
  if(a==="adminGetLiveQuizActivity"){
    await session(c,b.token,"admin");const r=await c.query("SELECT la.*,u.full_name,u.username,u.branch,u.position,co.title AS course_title FROM live_activity la JOIN users u USING(user_id) JOIN courses co USING(course_id) ORDER BY la.updated_at DESC");
    return {ok:true,activity:r.rows.map(x=>({...x,participantName:x.full_name,courseTitle:x.course_title,lastActivityAt:iso(x.last_activity_at),updatedAt:iso(x.updated_at),status:x.client_status==="completed"?"Completed":Date.now()-new Date(x.last_activity_at).getTime()<=30000?"Active":Date.now()-new Date(x.last_activity_at).getTime()<=120000?"Idle":"Disconnected"}))};
  }
  if(a==="adminGetDashboard"){const u=await session(c,b.token,"admin");return dashboard(c,u,clean(b.courseId));}
  if(a==="adminGetCourse"){
    await session(c,b.token,"admin");const r=await c.query("SELECT * FROM courses WHERE course_id=$1",[clean(b.courseId)]);if(!r.rowCount)throw new Error("Course not found.");const qs=await c.query("SELECT * FROM questions WHERE course_id=$1 AND is_archived_placeholder=false ORDER BY order_no",[b.courseId]);return {ok:true,course:publicCourse(r.rows[0],qs.rows.length),questions:qs.rows.map(q=>({id:q.question_id,prompt:q.question_text,options:[q.option_a,q.option_b,q.option_c,q.option_d],correct:q.correct_option||"A",points:n(q.points,1),explanation:q.explanation||""}))};
  }
  if(a==="adminSaveCourse"){
    const u=await session(c,b.token,"admin"), input=b.course||{}, title=clean(input.title), qs=Array.isArray(input.questions)?input.questions:[];if(!title||!qs.length)throw new Error("Course title and at least one question are required.");
    const prepared=qs.map((q:any,i:number)=>{const opts=Array.isArray(q.options)?q.options.map(clean):[];const correct=String(q.correct||"A").toUpperCase();if(!clean(q.prompt)||opts.length!==4||opts.some((x:string)=>!x)||!["A","B","C","D"].includes(correct))throw new Error("Each question needs a prompt, four choices, and a valid correct answer.");return {question_id:uid(),order_no:i+1,question_text:clean(q.prompt),option_a:opts[0],option_b:opts[1],option_c:opts[2],option_d:opts[3],correct_option:correct,points:Math.max(1,n(q.points,1)),explanation:clean(q.explanation)};});
    const id=clean(input.id)||uid(), old=await c.query("SELECT * FROM courses WHERE course_id=$1",[id]), now=new Date(), start=input.startAt?new Date(input.startAt):null,end=input.endAt?new Date(input.endAt):null;if(start&&Number.isNaN(start.getTime())||end&&Number.isNaN(end.getTime())||start&&end&&end<=start)throw new Error("Course schedule is invalid.");
    await c.query("BEGIN");try{
      const vals=[title,clean(input.description),clean(input.category)||"General",clamp(n(input.passingScore,75),1,100),Math.max(1,n(input.duration,20)),start,end,["live","upcoming","scheduled","completed","archived"].includes(clean(input.status))?clean(input.status):"draft",clamp(Math.floor(n(input.attemptLimit)),0,100),bool(input.randomizeAnswers),now];
      if(old.rowCount)await c.query("UPDATE courses SET title=$2,description=$3,category=$4,passing_score=$5,time_limit_min=$6,start_at=$7,end_at=$8,status=$9,attempt_limit=$10,randomize_answers=$11,updated_at=$12 WHERE course_id=$1",[id,...vals]);
      else await c.query("INSERT INTO courses(course_id,title,description,category,passing_score,time_limit_min,start_at,end_at,status,created_by,created_at,updated_at,attempt_limit,randomize_answers) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$12,$12,$13,$14)",[id,title,clean(input.description),clean(input.category)||"General",vals[3],vals[4],start,end,vals[7],u.user_id,now,vals[8],vals[9]]);
      if(old.rowCount)await c.query("DELETE FROM questions WHERE course_id=$1",[id]);
      for(const q of prepared)await c.query("INSERT INTO questions(question_id,course_id,order_no,question_text,option_a,option_b,option_c,option_d,correct_option,points,explanation,is_archived_placeholder) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false)",[q.question_id,id,q.order_no,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.points,q.explanation]);
      await c.query("COMMIT");
    }catch(e){await c.query("ROLLBACK");throw e;}
    const saved=await c.query("SELECT * FROM courses WHERE course_id=$1",[id]);return {ok:true,course:publicCourse(saved.rows[0],prepared.length)};
  }
  if(a==="adminDuplicateCourse"){
    await session(c,b.token,"admin");const src=await c.query("SELECT * FROM courses WHERE course_id=$1",[clean(b.courseId)]);if(!src.rowCount)throw new Error("Course not found.");const q=await c.query("SELECT * FROM questions WHERE course_id=$1 AND is_archived_placeholder=false ORDER BY order_no",[b.courseId]);if(!q.rowCount)throw new Error("The source course has no questions.");return action(c,{...b,action:"adminSaveCourse",course:{...src.rows[0],id:uid(),title:clean(b.title)||"Copy of "+src.rows[0].title,startAt:"",endAt:"",status:"draft",questions:q.rows.map(x=>({prompt:x.question_text,options:[x.option_a,x.option_b,x.option_c,x.option_d],correct:x.correct_option,points:x.points,explanation:x.explanation}))}});
  }
  if(a==="adminSetCourseStatus"){
    await session(c,b.token,"admin");const status=clean(b.status).toLowerCase();if(!["draft","upcoming","scheduled","live","completed","archived"].includes(status))throw new Error("Invalid course status.");const r=await c.query("UPDATE courses SET status=$2,updated_at=now() WHERE course_id=$1 RETURNING *",[clean(b.courseId),status]);if(!r.rowCount)throw new Error("Course not found.");const q=await c.query("SELECT count(*)::int n FROM questions WHERE course_id=$1 AND is_archived_placeholder=false",[b.courseId]);return {ok:true,course:publicCourse(r.rows[0],q.rows[0].n)};
  }
  if(a==="adminDeleteCourse"){
    await session(c,b.token,"admin");const id=clean(b.courseId),at=await c.query("SELECT 1 FROM attempts WHERE course_id=$1 LIMIT 1",[id]);if(at.rowCount){const r=await c.query("UPDATE courses SET status='archived',updated_at=now() WHERE course_id=$1 RETURNING *",[id]);return {ok:true,archived:true,message:"Course has results and was archived instead of deleted.",course:publicCourse(r.rows[0])};}const r=await c.query("DELETE FROM courses WHERE course_id=$1 RETURNING course_id",[id]);if(!r.rowCount)throw new Error("Course not found.");return {ok:true,deleted:true};
  }
  if(a==="adminSaveLesson"){
    const u=await session(c,b.token,"admin"),l=b.lesson||{},title=clean(l.title),summary=clean(l.summary),content=clean(l.content);if(!title||!summary||!content)throw new Error("Lesson title, summary and content are required.");if(content.length>45000)throw new Error("Lesson content is too long.");const id=clean(l.id)||uid();const r=await c.query("INSERT INTO lessons(lesson_id,title,summary,content,category,duration_min,resource_title,resource_url,status,created_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) ON CONFLICT(lesson_id) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,content=EXCLUDED.content,category=EXCLUDED.category,duration_min=EXCLUDED.duration_min,resource_title=EXCLUDED.resource_title,resource_url=EXCLUDED.resource_url,status=EXCLUDED.status,updated_at=now() RETURNING *",[id,title,summary,content,clean(l.category)||"General",clamp(n(l.duration,5),1,240),clean(l.resourceTitle),clean(l.resourceUrl),l.status==="draft"?"draft":"published",u.user_id]);return {ok:true,lesson:publicLesson(r.rows[0])};
  }
  if(a==="adminDeleteLesson"){await session(c,b.token,"admin");const r=await c.query("DELETE FROM lessons WHERE lesson_id=$1 RETURNING lesson_id",[clean(b.lessonId)]);if(!r.rowCount)throw new Error("Lesson not found.");return {ok:true,deleted:true,lessonId:b.lessonId};}
  if(a==="adminSaveParticipant"||a==="adminSaveUser"){
    await session(c,b.token,"admin");const x=b.user||b.participant||{},un=username(x.username),role=x.role==="admin"?"admin":"participant",pw=String(x.password||"");if(!/^[a-z0-9._-]{3,40}$/.test(un)||!clean(x.fullName)||pw.length<8)throw new Error("Enter a valid username, full name and password (at least 8 characters).");const salt=randomBytes(24).toString("hex"),id=uid();const p=position(x.position,role);const r=await c.query("INSERT INTO users(user_id,email,full_name,branch,password_hash,salt,role,status,created_at,username,position,excluded_from_reporting) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$10,false) RETURNING *",[id,username(x.email)||null,clean(x.fullName),clean(x.branch),passwordHash(pw,salt),salt,role,x.status==="inactive"?"inactive":"active",un,p]);return {ok:true,user:publicUser(r.rows[0])};
  }
  if(a==="adminSetUserPosition"){await session(c,b.token,"admin");const f=await c.query("SELECT role FROM users WHERE user_id=$1",[clean(b.userId)]);if(!f.rowCount)throw new Error("Account not found.");const p=position(b.position,f.rows[0].role);const r=await c.query("UPDATE users SET position=$2 WHERE user_id=$1 RETURNING *",[b.userId,p]);return {ok:true,user:publicUser(r.rows[0])};}
  if(a==="adminSetUserStatus"){const u=await session(c,b.token,"admin"),id=clean(b.userId),status=clean(b.status);if(!["active","inactive"].includes(status))throw new Error("Invalid account status.");if(id===u.user_id&&status==="inactive")throw new Error("You cannot deactivate your own administrator account.");const r=await c.query("UPDATE users SET status=$2 WHERE user_id=$1 RETURNING *",[id,status]);if(!r.rowCount)throw new Error("Account not found.");if(status==="inactive")await c.query("DELETE FROM sessions WHERE user_id=$1",[id]);return {ok:true,user:publicUser(r.rows[0])};}
  if(a==="adminSetUserReportingExclusion"){await session(c,b.token,"admin");const r=await c.query("UPDATE users SET excluded_from_reporting=$2 WHERE user_id=$1 AND role='participant' RETURNING *",[clean(b.userId),bool(b.excluded)]);if(!r.rowCount)throw new Error("Participant account not found.");return {ok:true,user:publicUser(r.rows[0])};}
  if(a==="adminResetPassword"){await session(c,b.token,"admin");const pw=String(b.newPassword||"");if(pw.length<8)throw new Error("New password must be at least eight characters.");const salt=randomBytes(24).toString("hex"),r=await c.query("UPDATE users SET salt=$2,password_hash=$3 WHERE user_id=$1 RETURNING user_id",[clean(b.userId),salt,passwordHash(pw,salt)]);if(!r.rowCount)throw new Error("Account not found.");await c.query("DELETE FROM sessions WHERE user_id=$1",[b.userId]);return {ok:true};}
  if(a==="getAccountLanguage"||a==="setAccountLanguage"){const u=await session(c,b.token),key="account_language:"+u.user_id;if(a==="getAccountLanguage"){const r=await c.query("SELECT value FROM app_settings WHERE key=$1",[key]);return {ok:true,language:r.rows[0]?.value==="id"?"id":"en"};}const lang=String(b.language).toLowerCase()==="id"?"id":"en";await c.query("INSERT INTO app_settings(key,value,updated_at) VALUES($1,$2,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[key,lang]);return {ok:true,language:lang,user:{...publicUser(u),language:lang}};}
  if(a==="adminGetExecutiveReport") throw new Error("Executive report migration is in progress; this action is not yet available on the Neon backend.");
  if(a==="adminSyncKnowledgeCentre") throw new Error("Knowledge Centre external file sync is not yet connected to Neon.");
  throw new Error("Unsupported action.");
}
async function participantHome(c: Client, u: Row) {
  const [cr,ar,lessons,counts]=await Promise.all([
    c.query("SELECT * FROM courses WHERE status NOT IN ('draft','archived') ORDER BY start_at NULLS LAST"),
    c.query("SELECT * FROM attempts WHERE user_id=$1 AND status='submitted' ORDER BY submitted_at DESC",[u.user_id]),
    lessonsFor(c,false),questionCounts(c)
  ]);
  const used:Record<string,number>={};for(const a of ar.rows)used[a.course_id]=(used[a.course_id]||0)+1;
  const history=ar.rows.map(a=>publicAttempt(a,cr.rows.find(x=>x.course_id===a.course_id)));
  const scores=history.map(x=>x.score);
  return {ok:true,user:publicUser(u),courses:cr.rows.map(co=>{const limit=clamp(Math.floor(n(co.attempt_limit)),0,100),count=used[co.course_id]||0;return {...publicCourse(co,counts[co.course_id]||0),attemptsUsed:count,attemptsRemaining:limit?Math.max(0,limit-count):null,canAttempt:!limit||count<limit};}),lessons,knowledgeCentre:{},history,summary:{completed:history.length,passed:history.filter(x=>x.passed).length,average:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,best:scores.length?Math.max(...scores):0}};
}
export async function POST(req: Request) {
  try { const body=await req.json() as Body; const result=await db(c=>action(c,body)); return Response.json(result,{headers:{"cache-control":"no-store"}}); }
  catch(e) { return Response.json({ok:false,error:e instanceof Error?e.message:"The request could not be completed."},{status:400,headers:{"cache-control":"no-store"}}); }
}
export async function GET() {
  try { return await db(async c=>{const r=await c.query("SELECT count(*)::int AS users FROM users");return Response.json({ok:true,service:"CGV Knowledge Academy · Neon",database:"connected",users:r.rows[0].users},{headers:{"cache-control":"no-store"}});});}
  catch { return Response.json({ok:false,service:"CGV Knowledge Academy · Neon",database:"unavailable"},{status:503,headers:{"cache-control":"no-store"}}); }
}
