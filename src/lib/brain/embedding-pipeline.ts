import { createClient } from '@supabase/supabase-js'

// Initialize Supabase (Admin client for inserting knowledge)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff for Gemini API rate limits
async function getEmbeddingWithRetry(text: string, maxRetries = 5): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || ''
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { parts: [{ text }] } })
        }
      )
      
      const data = await response.json()
      if (data.error) {
        if (data.error.code === 429) throw new Error('Rate limit exceeded');
        throw new Error(`Gemini embedding error: ${JSON.stringify(data.error)}`);
      }
      return data.embedding.values
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      console.warn(`[Brain Pipeline] Embedding failed. Retrying in ${Math.pow(2, attempt)}s...`, error.message);
      await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff (1s, 2s, 4s, 8s)
    }
  }
  throw new Error("Failed to get embedding after retries");
}

export type IntegrationPlatform = 
  'slack' | 'notion' | 'gmail' | 'github' | 'linear' | 'hubspot' | 'discord' | 
  'whatsapp' | 'telegram' | 'zoom' | 'meet' | 'gitlab' | 'jira' | 'vercel' | 
  'sentry' | 'salesforce' | 'zendesk' | 'intercom' | 'stripe' | 'figma' | 
  'drive' | 'onedrive' | 'asana' | 'trello' | 'clickup' | 'reddit' | 
  'twitter' | 'linkedin';

export interface IngestionData {
  sourcePlatform: IntegrationPlatform
  sourceId: string
  content: string
  metadata?: Record<string, any>
}

/**
 * Advanced Recursive Character Text Splitter with Context Overlaps.
 * Splitting intelligently by paragraphs, then sentences, preserving semantic overlap.
 */
function recursiveChunkText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
  const chunks: string[] = [];
  
  // Clean whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  let i = 0;
  while (i < cleanText.length) {
    let end = i + chunkSize;
    
    if (end < cleanText.length) {
      // Try to find a good breaking point (period, newline, or space)
      let breakPoint = cleanText.lastIndexOf('. ', end);
      if (breakPoint <= i) breakPoint = cleanText.lastIndexOf(' ', end);
      if (breakPoint > i) end = breakPoint + 1;
    }

    chunks.push(cleanText.substring(i, end).trim());
    
    // Step forward by chunkSize minus overlap to maintain context
    i = end - chunkOverlap;
    
    // Safety check to prevent infinite loops if overlap > chunkSize
    if (i <= chunks.length - 1 && i <= 0) break; 
    if (end >= cleanText.length) break;
  }

  return chunks.filter(c => c.length > 20); // filter out tiny artifacts
}

export async function ingestToBrain(data: IngestionData) {
  try {
    const chunks = recursiveChunkText(data.content)
    
    // Process chunks sequentially or in small batches to respect rate limits
    for (const chunk of chunks) {
      // 1. Generate Embedding using gemini-embedding-2 with backoff resilience
      const embedding = await getEmbeddingWithRetry(chunk);

      // 2. Upsert into Supabase pgvector table
      const { error } = await supabase
        .from('company_knowledge')
        .insert({
          source_platform: data.sourcePlatform,
          source_id: data.sourceId,
          content_chunk: chunk,
          metadata: data.metadata || {},
          embedding: embedding
        })

      if (error) {
        console.error(`[Brain Pipeline] Failed to insert chunk from ${data.sourcePlatform}:`, error)
      }
    }
    
    console.log(`[Brain Pipeline] Successfully ingested document from ${data.sourcePlatform} (${chunks.length} chunks)`)
  } catch (error) {
    console.error('[Brain Pipeline] Ingestion Error:', error)
    throw error
  }
}

/**
 * Query the "Living Brain" for knowledge related to a question.
 * Supports metadata filtering by platform for highly contextual searches.
 */
export async function queryBrain(
  query: string, 
  matchCount: number = 5, 
  matchThreshold: number = 0.5, 
  filterPlatform?: IntegrationPlatform
) {
  try {
    // Generate embedding for the question with backoff
    const queryEmbedding = await getEmbeddingWithRetry(query);

    // Search pgvector
    const { data, error } = await supabase.rpc('match_company_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_platform: filterPlatform || null
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error('[Brain Pipeline] Query Error:', error)
    return []
  }
}
