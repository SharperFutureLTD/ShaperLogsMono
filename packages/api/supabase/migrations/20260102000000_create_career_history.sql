-- Create career_history table
create table if not exists career_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  company text not null,
  start_date date,
  end_date date,
  is_current boolean default false,
  description text,
  skills text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table career_history enable row level security;

-- Policies
create policy "Users can view own career history"
  on career_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own career history"
  on career_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own career history"
  on career_history for update
  using (auth.uid() = user_id);

create policy "Users can delete own career history"
  on career_history for delete
  using (auth.uid() = user_id);
