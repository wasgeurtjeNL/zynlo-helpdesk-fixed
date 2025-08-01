export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          applied: boolean | null
          created_at: string | null
          edited_version: string | null
          feedback_text: string | null
          id: string
          language: string | null
          rating: number | null
          suggestion: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          edited_version?: string | null
          feedback_text?: string | null
          id?: string
          language?: string | null
          rating?: number | null
          suggestion: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          edited_version?: string | null
          feedback_text?: string | null
          id?: string
          language?: string | null
          rating?: number | null
          suggestion?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          cost_cents: number
          created_at: string | null
          id: string
          model_used: string
          prompt: string
          response: string
          ticket_id: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string | null
          id?: string
          model_used: string
          prompt: string
          response: string
          ticket_id: string
          tokens_used?: number
          user_id: string
        }
        Update: {
          cost_cents?: number
          created_at?: string | null
          id?: string
          model_used?: string
          prompt?: string
          response?: string
          ticket_id?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_summary: {
        Row: {
          created_at: string | null
          id: string
          month: string
          total_cost_cents: number
          total_requests: number
          total_tokens: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          total_cost_cents?: number
          total_requests?: number
          total_tokens?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          total_cost_cents?: number
          total_requests?: number
          total_tokens?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_conditions: {
        Row: {
          condition_group: number | null
          condition_type: string | null
          created_at: string | null
          field: string
          id: string
          operator: string
          rule_id: string
          value: Json
        }
        Insert: {
          condition_group?: number | null
          condition_type?: string | null
          created_at?: string | null
          field: string
          id?: string
          operator: string
          rule_id: string
          value: Json
        }
        Update: {
          condition_group?: number | null
          condition_type?: string | null
          created_at?: string | null
          field?: string
          id?: string
          operator?: string
          rule_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "auto_reply_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_reply_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_execution_logs: {
        Row: {
          conditions_met: boolean
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string | null
          recipient_phone: string | null
          response_sent: boolean | null
          rule_id: string
          sent_message_id: string | null
          template_used: string | null
          ticket_id: string | null
          trigger_type: string
        }
        Insert: {
          conditions_met: boolean
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          response_sent?: boolean | null
          rule_id: string
          sent_message_id?: string | null
          template_used?: string | null
          ticket_id?: string | null
          trigger_type: string
        }
        Update: {
          conditions_met?: boolean
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          response_sent?: boolean | null
          rule_id?: string
          sent_message_id?: string | null
          template_used?: string | null
          ticket_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_reply_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reply_execution_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reply_execution_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_reply_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reply_execution_logs_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reply_execution_logs_template_used_fkey"
            columns: ["template_used"]
            isOneToOne: false
            referencedRelation: "auto_reply_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reply_execution_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_rules: {
        Row: {
          business_hours: Json | null
          channel_types: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          keyword_match_type: string | null
          keywords: string[] | null
          name: string
          organization_id: string | null
          priority: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          business_hours?: Json | null
          channel_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          keyword_match_type?: string | null
          keywords?: string[] | null
          name: string
          organization_id?: string | null
          priority?: number | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          business_hours?: Json | null
          channel_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          keyword_match_type?: string | null
          keywords?: string[] | null
          name?: string
          organization_id?: string | null
          priority?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_reply_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_templates: {
        Row: {
          content_template: string
          content_type: string | null
          created_at: string | null
          execution_order: number | null
          id: string
          language: string | null
          rule_id: string
          subject_template: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content_template: string
          content_type?: string | null
          created_at?: string | null
          execution_order?: number | null
          id?: string
          language?: string | null
          rule_id: string
          subject_template?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content_template?: string
          content_type?: string | null
          created_at?: string | null
          execution_order?: number | null
          id?: string
          language?: string | null
          rule_id?: string
          subject_template?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_reply_templates_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_reply_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          email_address: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          name: string
          provider: string | null
          settings: Json | null
          type: Database["public"]["Enums"]["channel_type"]
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          email_address?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name: string
          provider?: string | null
          settings?: Json | null
          type: Database["public"]["Enums"]["channel_type"]
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          email_address?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name?: string
          provider?: string | null
          settings?: Json | null
          type?: Database["public"]["Enums"]["channel_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"]
          channel_id: string | null
          created_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          ticket_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel_type"]
          channel_id?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"]
          channel_id?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          mention_text: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
          position_end: number
          position_start: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mention_text: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
          position_end: number
          position_start: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mention_text?: string
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          message_id?: string
          position_end?: number
          position_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentions_mentioned_by_user_id_fkey"
            columns: ["mentioned_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          metadata: Json | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_drafts: {
        Row: {
          content: string
          content_type: string | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          metadata: Json | null
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_saved_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          shortcuts: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          shortcuts?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          shortcuts?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_saved_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json[] | null
          content: string
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          metadata: Json | null
          sender_id: string
          sender_name: string | null
          sender_type: Database["public"]["Enums"]["sender_type"]
        }
        Insert: {
          attachments?: Json[] | null
          content: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          sender_id: string
          sender_name?: string | null
          sender_type: Database["public"]["Enums"]["sender_type"]
        }
        Update: {
          attachments?: Json[] | null
          content?: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          sender_id?: string
          sender_name?: string | null
          sender_type?: Database["public"]["Enums"]["sender_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          push_enabled: boolean | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          activity_log_id: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          id: string
          is_read: boolean | null
          is_seen: boolean | null
          message: string
          read_at: string | null
          related_user_id: string | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          activity_log_id?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          is_seen?: boolean | null
          message: string
          read_at?: string | null
          related_user_id?: string | null
          ticket_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          activity_log_id?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          is_seen?: boolean | null
          message?: string
          read_at?: string | null
          related_user_id?: string | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token: string
          channel_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          channel_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          channel_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          columns: Json | null
          created_at: string | null
          description: string | null
          filters: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          sort_order: Json | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          sort_order?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          sort_order?: Json | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_detection_logs: {
        Row: {
          created_at: string | null
          detection_report: string | null
          email_from: string
          false_positive: boolean | null
          id: string
          is_spam: boolean
          message_id: string | null
          spam_score: number
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          detection_report?: string | null
          email_from: string
          false_positive?: boolean | null
          id?: string
          is_spam: boolean
          message_id?: string | null
          spam_score: number
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          detection_report?: string | null
          email_from?: string
          false_positive?: boolean | null
          id?: string
          is_spam?: boolean
          message_id?: string | null
          spam_score?: number
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spam_detection_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spam_detection_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_filters: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          rule_type: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_type: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_type?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "spam_filters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_training_data: {
        Row: {
          content: string
          id: string
          is_spam: boolean
          trained_at: string | null
          trained_by: string | null
        }
        Insert: {
          content: string
          id?: string
          is_spam: boolean
          trained_at?: string | null
          trained_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          is_spam?: boolean
          trained_at?: string | null
          trained_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spam_training_data_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          ticket_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          ticket_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          ticket_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_labels: {
        Row: {
          created_at: string | null
          label_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          label_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          label_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_labels_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_read_status: {
        Row: {
          created_at: string
          id: string
          read_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_read_status_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_read_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_id: string | null
          closed_at: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          is_spam: boolean | null
          marked_as_spam_at: string | null
          marked_as_spam_by: string | null
          metadata: Json | null
          number: number
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tags: string[] | null
          team_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          is_spam?: boolean | null
          marked_as_spam_at?: string | null
          marked_as_spam_by?: string | null
          metadata?: Json | null
          number?: number
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          assignee_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          is_spam?: boolean | null
          marked_as_spam_at?: string | null
          marked_as_spam_by?: string | null
          metadata?: Json | null
          number?: number
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_marked_as_spam_by_fkey"
            columns: ["marked_as_spam_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          created_at: string | null
          id: string
          is_typing: boolean | null
          last_activity: string | null
          ticket_id: string
          typing_in: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_typing?: boolean | null
          last_activity?: string | null
          ticket_id: string
          typing_in?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_typing?: boolean | null
          last_activity?: string | null
          ticket_id?: string
          typing_in?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_limits: {
        Row: {
          created_at: string | null
          id: string
          is_premium: boolean | null
          monthly_request_limit: number | null
          monthly_token_limit: number | null
          premium_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          monthly_request_limit?: number | null
          monthly_token_limit?: number | null
          premium_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          monthly_request_limit?: number | null
          monthly_token_limit?: number | null
          premium_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mentions: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message_id: string | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mentions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string | null
          current_page: string | null
          current_ticket_id: string | null
          last_seen: string | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_page?: string | null
          current_ticket_id?: string | null
          last_seen?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_page?: string | null
          current_ticket_id?: string | null
          last_seen?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_current_ticket_id_fkey"
            columns: ["current_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signatures: {
        Row: {
          created_at: string | null
          footer: string | null
          greeting: string | null
          html_content: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string | null
          signature_html: string | null
          signature_text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          footer?: string | null
          greeting?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string | null
          signature_html?: string | null
          signature_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          footer?: string | null
          greeting?: string | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string | null
          signature_html?: string | null
          signature_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          role: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          channel: string
          created_at: string | null
          error: string | null
          headers: Json | null
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error?: string | null
          headers?: Json | null
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error?: string | null
          headers?: Json | null
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_ticket: {
        Args: { p_ticket_id: string; p_agent_id: string }
        Returns: undefined
      }
      check_ai_usage_allowed: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_old_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_default_notification_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_notification: {
        Args:
          | {
              p_user_id: string
              p_ticket_id: string
              p_type: string
              p_title: string
              p_message: string
              p_data?: Json
            }
          | {
              p_user_id: string
              p_type: string
              p_title: string
              p_message: string
              p_action_url?: string
              p_data?: Json
              p_ticket_id?: string
              p_related_user_id?: string
              p_activity_log_id?: string
            }
        Returns: string
      }
      create_task_with_assignees: {
        Args: {
          p_title: string
          p_description: string
          p_status?: string
          p_priority?: string
          p_due_date?: string
          p_ticket_id?: string
          p_assignee_ids?: string[]
        }
        Returns: Json
      }
      create_ticket_with_message: {
        Args:
          | {
              p_subject: string
              p_content: string
              p_customer_email: string
              p_customer_name: string
              p_channel: Database["public"]["Enums"]["channel_type"]
              p_priority?: Database["public"]["Enums"]["ticket_priority"]
              p_metadata?: Json
            }
          | {
              p_subject: string
              p_content: string
              p_customer_email: string
              p_customer_name: string
              p_channel?: string
              p_priority?: string
            }
        Returns: Json
      }
      extract_and_store_mentions: {
        Args: {
          p_message_id: string
          p_content: string
          p_mentioned_by_user_id: string
        }
        Returns: undefined
      }
      get_inbox_counts: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_mention_suggestions: {
        Args: { p_query: string; p_limit?: number }
        Returns: {
          id: string
          full_name: string
          email: string
          username: string
          avatar_url: string
        }[]
      }
      get_notification_stats: {
        Args: { p_user_id: string }
        Returns: {
          total_count: number
          unread_count: number
          unseen_count: number
        }[]
      }
      get_task_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_tasks_with_details: {
        Args: {
          p_filter_status?: string
          p_filter_user_id?: string
          p_include_completed?: boolean
        }
        Returns: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          due_date: string
          created_by: string
          ticket_id: string
          created_at: string
          completed_at: string
          creator: Json
          assignees: Json
          comment_count: number
        }[]
      }
      get_ticket_active_users: {
        Args: { p_ticket_id: string }
        Returns: {
          user_id: string
          email: string
          full_name: string
          status: string
          is_typing: boolean
        }[]
      }
      get_ticket_stats: {
        Args: {
          p_team_id?: string
          p_agent_id?: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: Json
      }
      get_tickets_with_last_message: {
        Args: {
          p_status?: Database["public"]["Enums"]["ticket_status"]
          p_offset?: number
          p_limit?: number
        }
        Returns: {
          id: string
          number: number
          subject: string
          description: string
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["ticket_priority"]
          customer_id: string
          assignee_id: string
          team_id: string
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
          resolved_at: string
          closed_at: string
          customer: Json
          assignee: Json
          last_message: Json
          total_count: number
        }[]
      }
      get_typing_users: {
        Args: { p_ticket_id: string; p_typing_in?: string }
        Returns: {
          user_id: string
          full_name: string
          avatar_url: string
          typing_in: string
          last_activity: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      handle_message_attachment_upload: {
        Args: {
          p_message_id: string
          p_file_name: string
          p_file_size: number
          p_file_type: string
          p_storage_path: string
          p_user_id: string
        }
        Returns: string
      }
      increment_ticket_version: {
        Args: { p_ticket_id: string; p_expected_version?: number }
        Returns: number
      }
      is_ticket_unread: {
        Args: { ticket_id_param: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_ticket_id: string
          p_user_id: string
          p_action_type: string
          p_action_description: string
          p_old_value?: string
          p_new_value?: string
          p_metadata?: Json
        }
        Returns: string
      }
      mark_mentions_as_read: {
        Args: { p_user_id: string; p_message_ids?: string[] }
        Returns: number
      }
      mark_notifications_as_read: {
        Args:
          | { p_user_id: string; p_notification_ids?: string[] }
          | {
              p_user_id: string
              p_notification_ids?: string[]
              p_mark_all?: boolean
            }
        Returns: number
      }
      mark_notifications_as_seen: {
        Args: { p_user_id: string; p_notification_ids?: string[] }
        Returns: number
      }
      mark_ticket_as_read: {
        Args: { ticket_id_param: string }
        Returns: undefined
      }
      mark_ticket_as_spam: {
        Args: { p_ticket_id: string; p_is_spam?: boolean }
        Returns: undefined
      }
      merge_tickets: {
        Args: { p_primary_ticket_id: string; p_duplicate_ticket_ids: string[] }
        Returns: undefined
      }
      record_ai_usage: {
        Args: {
          p_user_id: string
          p_ticket_id: string
          p_prompt: string
          p_response: string
          p_model_used: string
          p_tokens_used: number
          p_cost_cents: number
        }
        Returns: string
      }
      search_tickets: {
        Args: {
          p_query: string
          p_status?: Database["public"]["Enums"]["ticket_status"][]
          p_assignee_id?: string
          p_customer_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          number: number
          subject: string
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["ticket_priority"]
          customer_name: string
          assignee_name: string
          created_at: string
          updated_at: string
          last_message_at: string
          message_count: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      toggle_favorite: {
        Args: { p_user_id: string; p_ticket_id: string }
        Returns: boolean
      }
      trigger_gmail_sync: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_task_status: {
        Args: { p_task_id: string; p_status: string }
        Returns: boolean
      }
      update_typing_status: {
        Args: {
          p_ticket_id: string
          p_user_id: string
          p_is_typing: boolean
          p_typing_in?: string
        }
        Returns: undefined
      }
      update_user_presence: {
        Args: {
          p_user_id: string
          p_status?: string
          p_current_page?: string
          p_current_ticket_id?: string
          p_metadata?: Json
        }
        Returns: {
          created_at: string | null
          current_page: string | null
          current_ticket_id: string | null
          last_seen: string | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
      }
    }
    Enums: {
      channel_type: "email" | "whatsapp" | "chat" | "phone" | "api"
      sender_type: "customer" | "agent" | "system"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "new" | "open" | "pending" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      channel_type: ["email", "whatsapp", "chat", "phone", "api"],
      sender_type: ["customer", "agent", "system"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["new", "open", "pending", "resolved", "closed"],
    },
  },
} as const
