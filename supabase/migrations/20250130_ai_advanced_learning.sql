-- Advanced AI Learning System Schema

-- 1. AI Learning Patterns - Store common patterns and responses
CREATE TABLE ai_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('query', 'response', 'interaction', 'resolution')),
  pattern_content JSONB NOT NULL, -- Structured pattern data
  frequency INTEGER DEFAULT 1,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  context_tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'nl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. AI Context Memory - Store conversation contexts
CREATE TABLE ai_context_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  context_vector VECTOR(1536), -- For semantic search
  context_summary TEXT,
  key_entities JSONB, -- Named entities, products, etc.
  sentiment_score DECIMAL(3,2), -- -1 to 1
  topic_categories TEXT[],
  resolution_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Response Analytics - Track performance metrics
CREATE TABLE ai_response_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID,
  ticket_id UUID REFERENCES tickets(id),
  response_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  token_count INTEGER,
  model_used TEXT,
  was_helpful BOOLEAN,
  was_edited BOOLEAN,
  edit_distance INTEGER,
  final_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI Learning Queue - Queue for batch learning
CREATE TABLE ai_learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  conversation_data JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI Model Performance - Track model performance over time
CREATE TABLE ai_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_responses INTEGER DEFAULT 0,
  average_confidence DECIMAL(3,2),
  average_response_time_ms INTEGER,
  total_tokens_used INTEGER,
  user_satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, date)
);

-- 6. AI Custom Responses - User-defined response templates
CREATE TABLE ai_custom_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_patterns TEXT[] NOT NULL,
  response_template TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'nl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI Training Sessions - Track manual training sessions
CREATE TABLE ai_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id),
  session_type TEXT CHECK (session_type IN ('feedback_review', 'pattern_training', 'response_tuning')),
  items_reviewed INTEGER DEFAULT 0,
  patterns_created INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Contextual Rules - Business-specific rules
CREATE TABLE ai_contextual_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  condition_type TEXT CHECK (condition_type IN ('keyword', 'sentiment', 'category', 'customer_type', 'time_based')),
  condition_data JSONB NOT NULL,
  action_type TEXT CHECK (action_type IN ('suggest_response', 'auto_tag', 'escalate', 'apply_template')),
  action_data JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI Learning Metrics - Aggregated learning metrics
CREATE TABLE ai_learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_interactions INTEGER DEFAULT 0,
  patterns_identified INTEGER DEFAULT 0,
  accuracy_improvement DECIMAL(5,2),
  response_time_improvement DECIMAL(5,2),
  new_contexts_learned INTEGER DEFAULT 0,
  feedback_incorporated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date)
);

-- 10. AI Embeddings Cache - Cache for vector embeddings
CREATE TABLE ai_embeddings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  content_type TEXT CHECK (content_type IN ('message', 'ticket', 'response', 'pattern')),
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_patterns_type_lang ON ai_learning_patterns(pattern_type, language);
CREATE INDEX idx_ai_patterns_tags ON ai_learning_patterns USING GIN(context_tags);
CREATE INDEX idx_ai_context_ticket ON ai_context_memory(ticket_id);
CREATE INDEX idx_ai_context_vector ON ai_context_memory USING ivfflat (context_vector vector_cosine_ops);
CREATE INDEX idx_ai_analytics_ticket ON ai_response_analytics(ticket_id);
CREATE INDEX idx_ai_queue_status ON ai_learning_queue(processing_status, priority);
CREATE INDEX idx_ai_custom_triggers ON ai_custom_responses USING GIN(trigger_patterns);
CREATE INDEX idx_ai_embeddings_hash ON ai_embeddings_cache(content_hash);

-- Enable Row Level Security
ALTER TABLE ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_custom_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contextual_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin access for most tables)
CREATE POLICY "Admins can manage AI learning data" ON ai_learning_patterns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can view AI context" ON ai_context_memory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "System can insert AI context" ON ai_context_memory
  FOR INSERT USING (true); -- Allow system to insert

CREATE POLICY "All agents can view analytics" ON ai_response_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "System can insert analytics" ON ai_response_analytics
  FOR INSERT USING (true);

CREATE POLICY "Admins can manage learning queue" ON ai_learning_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "All can view model performance" ON ai_model_performance
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage model performance" ON ai_model_performance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can manage their custom responses" ON ai_custom_responses
  FOR ALL USING (
    created_by = auth.uid() OR 
    is_global = true OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can manage training sessions" ON ai_training_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can manage contextual rules" ON ai_contextual_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "All can view learning metrics" ON ai_learning_metrics
  FOR SELECT USING (true);

CREATE POLICY "System can use embeddings cache" ON ai_embeddings_cache
  FOR ALL USING (true);

-- Functions for AI Learning

-- Function to calculate pattern similarity
CREATE OR REPLACE FUNCTION calculate_pattern_similarity(
  pattern1 JSONB,
  pattern2 JSONB
) RETURNS DECIMAL AS $$
DECLARE
  similarity DECIMAL;
BEGIN
  -- Simplified similarity calculation
  -- In production, use more sophisticated algorithms
  similarity := 0.0;
  
  -- Compare keys
  IF jsonb_typeof(pattern1) = 'object' AND jsonb_typeof(pattern2) = 'object' THEN
    similarity := (
      SELECT COUNT(*)::DECIMAL / GREATEST(
        jsonb_object_keys(pattern1)::TEXT[],
        jsonb_object_keys(pattern2)::TEXT[]
      )::DECIMAL
      FROM (
        SELECT key FROM jsonb_object_keys(pattern1) AS key
        INTERSECT
        SELECT key FROM jsonb_object_keys(pattern2) AS key
      ) AS common_keys
    );
  END IF;
  
  RETURN similarity;
END;
$$ LANGUAGE plpgsql;

-- Function to update pattern statistics
CREATE OR REPLACE FUNCTION update_pattern_statistics(
  pattern_id UUID,
  was_successful BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE ai_learning_patterns
  SET 
    frequency = frequency + 1,
    success_rate = (
      (success_rate * frequency + CASE WHEN was_successful THEN 100 ELSE 0 END) / (frequency + 1)
    ),
    updated_at = NOW()
  WHERE id = pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process learning queue
CREATE OR REPLACE FUNCTION process_learning_queue_item(
  queue_item_id UUID
) RETURNS void AS $$
DECLARE
  item RECORD;
BEGIN
  -- Get queue item
  SELECT * INTO item FROM ai_learning_queue 
  WHERE id = queue_item_id AND processing_status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Update status to processing
  UPDATE ai_learning_queue 
  SET processing_status = 'processing', processed_at = NOW()
  WHERE id = queue_item_id;
  
  -- Process the item (simplified - in production, call ML service)
  BEGIN
    -- Extract patterns, update statistics, etc.
    -- This would involve complex ML processing
    
    -- Mark as completed
    UPDATE ai_learning_queue 
    SET processing_status = 'completed'
    WHERE id = queue_item_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Mark as failed with error
    UPDATE ai_learning_queue 
    SET 
      processing_status = 'failed',
      error_message = SQLERRM
    WHERE id = queue_item_id;
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update embeddings cache access time
CREATE OR REPLACE FUNCTION update_embedding_access_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embedding_access
  BEFORE UPDATE ON ai_embeddings_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_access_time(); 