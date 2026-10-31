-- Knowledge Academy Neon PostgreSQL schema.
-- Safe to apply to a NEW migration database. No legacy rows are deleted.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table if not exists public.app_settings (
  key text primary key, value text, updated_at timestamptz not null default now()
);
create table if not exists public.users (
  user_id text primary key, email text, full_name text not null, branch text,
  password_hash text, salt text, role text not null default 'participant',
  status text not null default 'active', created_at timestamptz not null default now(),
  last_login timestamptz, username text, position text,
  excluded_from_reporting boolean not null default false
);
create unique index if not exists users_username_lower_uq on public.users (lower(username))
  where username is not null and username <> '';
create unique index if not exists users_email_lower_uq on public.users (lower(email))
  where email is not null and email <> '';
create index if not exists users_status_role_idx on public.users (status, role);

create table if not exists public.courses (
  course_id text primary key, title text not null, description text, category text,
  passing_score numeric(7,2), time_limit_min integer, start_at timestamptz,
  end_at timestamptz, status text not null default 'draft',
  created_by text references public.users(user_id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  attempt_limit integer, randomize_answers boolean not null default false
);
create index if not exists courses_status_dates_idx on public.courses (status, start_at, end_at);

create table if not exists public.lessons (
  lesson_id text primary key, title text not null, summary text, content text,
  category text, duration_min integer, resource_title text, resource_url text,
  status text not null default 'draft',
  created_by text references public.users(user_id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists lessons_status_category_idx on public.lessons (status, category);

create table if not exists public.questions (
  question_id text primary key,
  course_id text not null references public.courses(course_id) on delete cascade,
  order_no integer not null default 0, question_text text not null,
  option_a text, option_b text, option_c text, option_d text,
  correct_option text, points numeric(8,2) not null default 1, explanation text
);
create index if not exists questions_course_order_idx on public.questions (course_id, order_no);

create table if not exists public.attempts (
  attempt_id text primary key,
  course_id text not null references public.courses(course_id) on delete cascade,
  user_id text not null references public.users(user_id) on delete cascade,
  started_at timestamptz not null default now(), submitted_at timestamptz,
  status text not null default 'in_progress', score numeric(8,2),
  correct_count integer, total_questions integer, duration_seconds integer,
  answers_json jsonb not null default '{}'::jsonb
);
create index if not exists attempts_course_user_idx on public.attempts (course_id, user_id);
create index if not exists attempts_user_submitted_idx on public.attempts (user_id, submitted_at desc);
create index if not exists attempts_status_started_idx on public.attempts (status, started_at desc);

create table if not exists public.answers (
  answer_id text primary key,
  attempt_id text not null references public.attempts(attempt_id) on delete cascade,
  question_id text not null references public.questions(question_id) on delete cascade,
  selected_option text, is_correct boolean,
  points_awarded numeric(8,2) not null default 0, answered_at timestamptz,
  unique (attempt_id, question_id)
);
create index if not exists answers_attempt_idx on public.answers (attempt_id);

create table if not exists public.sessions (
  token_hash text primary key,
  user_id text not null references public.users(user_id) on delete cascade,
  role text not null, expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_expiry_idx on public.sessions (expires_at);

create table if not exists public.live_activity (
  attempt_id text primary key references public.attempts(attempt_id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete cascade,
  user_id text not null references public.users(user_id) on delete cascade,
  current_question integer not null default 0, total_questions integer not null default 0,
  answered_count integer not null default 0, client_status text not null default 'active',
  last_activity_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists live_activity_course_updated_idx on public.live_activity (course_id, updated_at desc);
create index if not exists live_activity_user_idx on public.live_activity (user_id);

create table if not exists public.user_preferences (
  user_id text primary key references public.users(user_id) on delete cascade,
  language text not null default 'en', updated_at timestamptz not null default now()
);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();
drop trigger if exists live_activity_set_updated_at on public.live_activity;
create trigger live_activity_set_updated_at before update on public.live_activity
for each row execute function public.set_updated_at();
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();
