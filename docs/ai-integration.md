# AI Integration Documentation

## Overview

This document describes the AI integration in the Zynlo Helpdesk system, including usage tracking, billing, and commercial features.

## Features

### 1. AI-Powered Reply Suggestions
- Generates contextual reply suggestions based on customer messages
- Supports multiple languages (Dutch, English, German, French, Spanish)
- Provides 3 different suggestion approaches per request
- Context-aware suggestions using conversation history

### 2. Usage Tracking & Limits
- Per-user monthly request limits (default: 100 requests)
- Per-user monthly token limits (default: 10,000 tokens)
- Real-time usage tracking and cost calculation
- Premium tier support with higher limits

### 3. Commercial Features
- Usage-based billing system
- Cost tracking per request (cents precision)
- Monthly usage summaries
- Premium subscription management
- Usage history and analytics

## Database Schema

### Tables Created:

1. **ai_usage** - Stores individual AI usage records
   - user_id, ticket_id, prompt, response
   - model_used, tokens_used, cost_cents
   - created_at timestamp

2. **ai_usage_summary** - Monthly aggregated usage
   - user_id, month, total_requests
   - total_tokens, total_cost_cents
   - Automatically updated via stored procedures

3. **user_ai_limits** - User-specific limits and premium status
   - monthly_token_limit, monthly_request_limit
   - is_premium, premium_expires_at

## API Configuration

### Required Environment Variables:

```env
# OpenAI API Key (required for AI suggestions)
OPENAI_API_KEY=sk-...

# Optional: Override default model
OPENAI_MODEL=gpt-3.5-turbo
```

### Supported Models:
- GPT-3.5-turbo (default, most cost-effective)
- GPT-4 (higher quality, more expensive)

## Usage Instructions

### For Users:

1. **Using AI Suggestions:**
   - Click the "AI suggesties" button in the reply panel
   - Wait for suggestions to load (typically 2-3 seconds)
   - Click "Gebruik suggestie" to apply or "Volgende suggestie" to cycle through options
   - Monitor your usage via the counter displayed next to the button

2. **Checking Usage:**
   - Navigate to Settings > AI Usage
   - View current month statistics
   - See historical usage and costs
   - Upgrade to premium if limits are reached

### For Administrators:

1. **Setting Up:**
   ```bash
   # Set OpenAI API key in production
   fly secrets set OPENAI_API_KEY=sk-...
   ```

2. **Adjusting Limits:**
   ```sql
   -- Update user limits
   UPDATE user_ai_limits 
   SET monthly_request_limit = 200,
       monthly_token_limit = 20000
   WHERE user_id = '<user-id>';
   
   -- Grant premium access
   UPDATE user_ai_limits
   SET is_premium = true,
       premium_expires_at = NOW() + INTERVAL '1 month'
   WHERE user_id = '<user-id>';
   ```

3. **Monitoring Costs:**
   ```sql
   -- View total costs per month
   SELECT 
     TO_CHAR(month, 'YYYY-MM') as month,
     SUM(total_cost_cents) / 100.0 as total_cost_eur,
     SUM(total_requests) as total_requests,
     COUNT(DISTINCT user_id) as active_users
   FROM ai_usage_summary
   GROUP BY month
   ORDER BY month DESC;
   ```

## Pricing Model

### Cost Calculation:
- Based on OpenAI token usage
- GPT-3.5-turbo: €0.0015 per 1,000 tokens
- GPT-4: €0.03 per 1,000 tokens (20x more expensive)

### Suggested User Pricing:
- Free tier: 100 requests/month, 10,000 tokens
- Premium: €9.99/month for 500 requests, 50,000 tokens
- Enterprise: Custom pricing for unlimited usage

## Security Considerations

1. **API Key Protection:**
   - Never expose OpenAI API key to frontend
   - Use server-side API routes only
   - Implement rate limiting per user

2. **Data Privacy:**
   - AI prompts and responses are logged for billing
   - Sensitive customer data should be anonymized
   - Implement data retention policies

3. **Access Control:**
   - RLS policies ensure users can only see their own usage
   - Admin roles can view organization-wide statistics
   - Service role required for recording usage

## Troubleshooting

### Common Issues:

1. **"Invalid OpenAI API key" error:**
   - Check OPENAI_API_KEY environment variable
   - Ensure API key has sufficient credits

2. **"AI usage limit reached" error:**
   - User has exceeded monthly limits
   - Upgrade to premium or wait for month reset
   - Admin can manually increase limits

3. **Slow response times:**
   - OpenAI API latency (normal: 1-3 seconds)
   - Consider implementing response caching
   - Use streaming responses for better UX

## Future Enhancements

1. **Planned Features:**
   - Response quality feedback system
   - Custom prompt templates per organization
   - AI-powered ticket categorization
   - Sentiment analysis for priority routing

2. **Performance Optimizations:**
   - Implement response caching for common queries
   - Batch similar requests to reduce API calls
   - Use embeddings for semantic search

3. **Advanced Billing:**
   - Stripe integration for automatic billing
   - Usage-based pricing tiers
   - Organization-wide billing management
   - Detailed cost analytics dashboard

### AI Configuration

The AI system can be configured through the admin settings interface at `/settings/ai-config`. Administrators can:

1. **Customize System Prompts** - Adjust the AI personality and response style for each language
2. **Configure AI Models** - Choose between GPT-3.5, GPT-4, or other available models
3. **Adjust Parameters**:
   - Temperature (0-2): Controls creativity vs consistency
   - Max Tokens: Limit response length
   - Number of Suggestions: How many alternatives to generate

### AI Training & Feedback

The system includes a feedback mechanism to improve AI suggestions over time:

1. **Automatic Tracking** - When agents use AI suggestions, it's recorded as positive feedback
2. **Manual Rating** - Agents can rate suggestions from 1-5 stars
3. **Feedback Collection** - Comments and edited versions help improve future suggestions
4. **Learning** - The system uses feedback to refine prompts and improve accuracy

### Configuration Options

All AI settings are stored in the `ai_settings` table with the following keys:

- `system_prompts` - Language-specific prompts that define AI behavior
- `user_prompt_template` - Template for generating suggestions
- `ai_config` - Model selection, parameters, and learning settings

Example configuration:
```json
{
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 300,
  "suggestions_count": 3,
  "enable_learning": true,
  "min_feedback_for_improvement": 10
}
```

### Managing AI Costs 