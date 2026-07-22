import { createClient } from '@supabase/supabase-js'

// Initialize Supabase (Admin client for inserting knowledge)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Raw fetch embedding using gemini-embedding-2 (3072 dims) — works with AQ. key type
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || ''
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } })
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(`Gemini embedding error: ${JSON.stringify(data.error)}`)
  return data.embedding.values
}

interface IngestionData {
  sourcePlatform: 'slack' | 'notion' | 'gmail' | 'github' | 'linear' | 'hubspot'
  sourceId: string
  content: string
  metadata?: Record<string, any>
}

/**
 * Strips basic markdown/html and chunks the text into semantic paragraphs.
 * For now, this is a simple whitespace/newline chunker.
 */
function chunkText(text: string, maxTokens = 800): string[] {
  // Simple heuristic: Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10)
  
  const chunks: string[] = []
  let currentChunk = ""

  for (const p of paragraphs) {
    if ((currentChunk.length + p.length) > maxTokens * 4) { // rough char-to-token ratio
      chunks.push(currentChunk.trim())
      currentChunk = p
    } else {
      currentChunk += "\n\n" + p
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  // If there were no double newlines, just return the whole text (if it's short enough)
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(text.trim())
  }

  return chunks
}

export async function ingestToBrain(data: IngestionData) {
  try {
    const chunks = chunkText(data.content)
    
    for (const chunk of chunks) {
      // 1. Generate Embedding using gemini-embedding-2 (3072 dimensions)
      const embedding = await getEmbedding(chunk);

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
 */
export async function queryBrain(query: string, matchCount: number = 5, matchThreshold: number = 0.5) {
  try {
    // Generate embedding for the question using gemini-embedding-2
    const queryEmbedding = await getEmbedding(query);

    // Search pgvector
    const { data, error } = await supabase.rpc('match_company_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error('[Brain Pipeline] Query Error:', error)
    return []
  }
}
