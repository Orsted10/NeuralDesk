-- Create a table for public profiles
create table public.users (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Function to handle new user signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Chat Sessions Table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for chat_sessions
alter table public.chat_sessions enable row level security;

create policy "Users can view own chat sessions" on chat_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat sessions" on chat_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own chat sessions" on chat_sessions
  for delete using (auth.uid() = user_id);

-- Chat History Table
create table public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  session_id uuid references public.chat_sessions on delete cascade not null,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for chat_history
alter table public.chat_history enable row level security;

-- Create policies for chat_history
create policy "Users can view own chat history" on chat_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat history" on chat_history
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own chat history" on chat_history
  for delete using (auth.uid() = user_id);
