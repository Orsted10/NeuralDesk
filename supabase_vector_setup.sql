-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store company knowledge chunks across all integrations
create table public.company_knowledge (
  id uuid default gen_random_uuid() primary key,
  source_platform text not null, -- e.g., 'slack', 'notion', 'gmail', 'github', 'linear'
  source_id text not null,       -- ID of the message/doc in the source platform
  content_chunk text not null,   -- The actual chunk of text
  metadata jsonb default '{}'::jsonb, -- Author, timestamps, channel name, URLs, etc.
  embedding vector(3072),        -- using Google gemini-embedding-2 which is 3072 dimensional
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create a generic index for pgvector performance (hnsw is faster but requires pgvector 0.5+)
create index on public.company_knowledge using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Enable RLS (Assuming users need permission to read their company's data)
alter table public.company_knowledge enable row level security;

-- Default policy: For this prototype we will allow authenticated users to view
-- Note: In a real enterprise system, RLS should check the metadata->>'workspace_id'
create policy "Users can view company knowledge" on company_knowledge
  for select using (auth.role() = 'authenticated');

create policy "Service roles can insert company knowledge" on company_knowledge
  for insert with check (auth.role() = 'service_role' or auth.role() = 'authenticated');

-- Function to match embeddings using Cosine Similarity
create or replace function public.match_company_knowledge (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_platform text default null
)
returns table (
  id uuid,
  source_platform text,
  source_id text,
  content_chunk text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    company_knowledge.id,
    company_knowledge.source_platform,
    company_knowledge.source_id,
    company_knowledge.content_chunk,
    company_knowledge.metadata,
    1 - (company_knowledge.embedding <=> query_embedding) as similarity
  from public.company_knowledge
  where (filter_platform is null or company_knowledge.source_platform = filter_platform)
    and 1 - (company_knowledge.embedding <=> query_embedding) > match_threshold
  order by company_knowledge.embedding <=> query_embedding
  limit match_count;
$$;
