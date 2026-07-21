import { pipeline, env } from '@xenova/transformers';
import { createClient } from '@supabase/supabase-js';

// Configuration for Transformers.js in Node environment
// Disable local models to fetch weights from HuggingFace directly, unless you download them
env.allowLocalModels = false;
env.cacheDir = '/tmp/.cache';

// Using a lightweight embedding model that yields 384-dimensional vectors
const MODEL_NAME = 'Supabase/gte-small';

// Singleton for the feature extraction pipeline
class PipelineSingleton {
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline('feature-extraction', MODEL_NAME);
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await PipelineSingleton.getInstance();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error('Failed to generate embedding');
  }
}

export async function upsertKnowledge(
  content: string, 
  metadata: Record<string, any>
) {
  // Use Service Role Key for server-side trusted DB inserts to bypass RLS policies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const embedding = await generateEmbedding(content);

  const { error } = await supabase
    .from('aetheria_knowledge')
    .insert({
      content,
      metadata,
      embedding
    });

  if (error) {
    console.error('Error inserting into aetheria_knowledge:', error);
    throw error;
  }
  return true;
}

export async function queryKnowledge(query: string, matchCount: number = 3, matchThreshold: number = 0.5) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const query_embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding,
    match_threshold: matchThreshold,
    match_count: matchCount
  });

  if (error) {
    console.error('Error searching knowledge:', error);
    throw error;
  }

  return data;
}
