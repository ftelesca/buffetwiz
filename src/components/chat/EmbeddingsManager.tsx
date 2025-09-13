import { pipeline } from "@huggingface/transformers";
import { supabase } from "@/integrations/supabase/client";

interface CachedResponse {
  content: string;
  embedding: number[];
  timestamp: string;
}

export class EmbeddingsManager {
  private embedder: any = null;
  private cache: Map<string, CachedResponse> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing embeddings model...');
      
      // Initialize small, fast embedding model for browser
      this.embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { device: "webgpu" } // Use WebGPU if available, fallback to CPU
      );
      
      this.initialized = true;
      console.log('Embeddings model initialized successfully');
      
      // Load cached responses from localStorage
      this.loadCacheFromStorage();
      
    } catch (error) {
      console.warn('Failed to initialize WebGPU embeddings, falling back to CPU:', error);
      
      try {
        this.embedder = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
          { device: "cpu" }
        );
        this.initialized = true;
        console.log('Embeddings model initialized with CPU');
      } catch (cpuError) {
        console.error('Failed to initialize embeddings model:', cpuError);
        this.initialized = false;
      }
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (!this.initialized || !this.embedder) {
      console.warn('Embeddings model not initialized, returning empty array');
      return [];
    }

    try {
      // Clean and truncate text
      const cleanText = text.substring(0, 512).trim();
      if (!cleanText) return [];

      const result = await this.embedder(cleanText, { 
        pooling: "mean", 
        normalize: true 
      });
      
      // Convert to regular array
      const embedding = Array.from(result.data) as number[];
      return embedding;
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  async getCachedResponse(query: string): Promise<CachedResponse | null> {
    if (!this.initialized) return null;

    try {
      const queryEmbedding = await this.getEmbedding(query);
      if (queryEmbedding.length === 0) return null;

      let bestMatch: { response: CachedResponse; similarity: number } | null = null;

      // Check in-memory cache first
      for (const [cachedQuery, response] of this.cache.entries()) {
        if (response.embedding.length === 0) continue;
        
        const similarity = this.cosineSimilarity(queryEmbedding, response.embedding);
        if (similarity > 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { response, similarity };
        }
      }

      if (bestMatch) {
        console.log('Found cached response with similarity:', bestMatch.similarity);
        return bestMatch.response;
      }

      // Check database cache
      const { data: cacheEntries } = await supabase
        .from('wizard_cache')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .limit(100);

      if (cacheEntries && cacheEntries.length > 0) {
        for (const entry of cacheEntries) {
          const responseData = entry.response_data as any;
          if (responseData?.embedding && Array.isArray(responseData.embedding)) {
            const similarity = this.cosineSimilarity(queryEmbedding, responseData.embedding);
            if (similarity > 0.85) {
              console.log('Found database cached response with similarity:', similarity);
              return {
                content: responseData.content || '',
                embedding: responseData.embedding,
                timestamp: entry.created_at
              };
            }
          }
        }
      }

      return null;
      
    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  async cacheResponse(query: string, response: string, embedding: number[]) {
    if (!this.initialized || embedding.length === 0) return;

    const cacheEntry: CachedResponse = {
      content: response,
      embedding,
      timestamp: new Date().toISOString()
    };

    // Store in memory cache
    this.cache.set(query, cacheEntry);

    // Limit memory cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Save to localStorage
    this.saveCacheToStorage();

    // Store in database for persistence across sessions
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

        const queryHash = this.hashString(query);
        
        await supabase
          .from('wizard_cache')
          .upsert({
            user_id: user.user.id,
            query_hash: queryHash,
            response_data: {
              content: response,
              embedding,
              query
            },
            expires_at: expiresAt.toISOString()
          });
      }
    } catch (error) {
      console.error('Error saving to database cache:', error);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private loadCacheFromStorage() {
    try {
      const cached = localStorage.getItem('chat_embeddings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cache = new Map(Object.entries(parsed));
        console.log(`Loaded ${this.cache.size} cached responses from storage`);
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  private saveCacheToStorage() {
    try {
      const cacheObj = Object.fromEntries(this.cache);
      localStorage.setItem('chat_embeddings_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  clearCache() {
    this.cache.clear();
    localStorage.removeItem('chat_embeddings_cache');
  }

  getCacheStats() {
    return {
      memoryEntries: this.cache.size,
      initialized: this.initialized
    };
  }
}