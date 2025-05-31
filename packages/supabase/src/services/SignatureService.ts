import { supabase } from '../client'
import type { Database } from '../types/database.types'

type UserSignature = Database['public']['Tables']['user_signatures']['Row']
type UserSignatureInsert = Database['public']['Tables']['user_signatures']['Insert']
type UserSignatureUpdate = Database['public']['Tables']['user_signatures']['Update']

export class SignatureService {
  static async getSignature(userId: string): Promise<UserSignature | null> {
    const { data, error } = await supabase
      .from('user_signatures')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching signature:', error)
      throw error
    }

    return data
  }

  static async createSignature(signature: UserSignatureInsert): Promise<UserSignature> {
    const { data, error } = await supabase
      .from('user_signatures')
      .insert(signature)
      .select()
      .single()

    if (error) {
      console.error('Error creating signature:', error)
      throw error
    }

    return data
  }

  static async updateSignature(userId: string, updates: UserSignatureUpdate): Promise<UserSignature> {
    const { data, error } = await supabase
      .from('user_signatures')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating signature:', error)
      throw error
    }

    return data
  }

  static async deleteSignature(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_signatures')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting signature:', error)
      throw error
    }
  }

  static async toggleSignature(userId: string, isActive: boolean): Promise<UserSignature> {
    return this.updateSignature(userId, { is_active: isActive })
  }
} 