import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreadReconstructor } from '../thread-reconstructor';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(),
        })),
        or: vi.fn(() => ({
          limit: vi.fn(),
        })),
        gte: vi.fn(() => ({
          order: vi.fn(),
        })),
        is: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  })),
}));

describe('ThreadReconstructor', () => {
  let threadReconstructor: ThreadReconstructor;
  let mockSupabase: any;

  beforeEach(() => {
    threadReconstructor = new ThreadReconstructor();
    mockSupabase = createClient('', '');
  });

  describe('findExistingThread', () => {
    it('should find thread by message ID references', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        conversations: {
          ticket_id: 'ticket-1',
        },
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [mockMessage],
              error: null,
            })),
          })),
        })),
      }));

      const result = await threadReconstructor.findExistingThread(
        'new-message-id',
        'parent-message-id',
        ['ref-1', 'ref-2'],
        'Re: Test Subject',
        'user@example.com'
      );

      expect(result).toEqual({
        ticketId: 'ticket-1',
        conversationId: 'conv-1',
      });
    });

    it('should fallback to subject matching when no references found', async () => {
      // Mock no messages found by ID
      mockSupabase.from = vi.fn((table) => {
        if (table === 'messages') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => ({
                  data: [],
                  error: null,
                })),
              })),
            })),
          };
        }
        
        // Mock tickets query
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [{
                  id: 'ticket-2',
                  subject: 'Test Subject',
                  conversations: [{
                    id: 'conv-2',
                    messages: [{
                      id: 'msg-2',
                      sender_id: 'user@example.com',
                    }],
                  }],
                }],
                error: null,
              })),
            })),
          })),
        };
      });

      const result = await threadReconstructor.findExistingThread(
        'new-message-id',
        undefined,
        undefined,
        'Re: Test Subject',
        'user@example.com'
      );

      expect(result).toEqual({
        ticketId: 'ticket-2',
        conversationId: 'conv-2',
      });
    });
  });

  describe('normalizeSubject', () => {
    it('should remove common email prefixes', () => {
      const testCases = [
        { input: 'Re: Test Subject', expected: 'test subject' },
        { input: 'RE: RE: Test Subject', expected: 'test subject' },
        { input: 'Fwd: Test Subject', expected: 'test subject' },
        { input: 'FW: Test Subject', expected: 'test subject' },
        { input: 'Re: Fwd: Test Subject', expected: 'test subject' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Access private method through any type
        const normalized = (threadReconstructor as any).normalizeSubject(input);
        expect(normalized).toBe(expected);
      });
    });

    it('should remove ticket numbers', () => {
      const testCases = [
        { input: 'Test Subject [#12345]', expected: 'test subject' },
        { input: 'Test Subject (#12345)', expected: 'test subject' },
        { input: '[#123] Test Subject', expected: 'test subject' },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = (threadReconstructor as any).normalizeSubject(input);
        expect(normalized).toBe(expected);
      });
    });
  });

  describe('subjectsMatch', () => {
    it('should match exact subjects', () => {
      const match = (threadReconstructor as any).subjectsMatch(
        'test subject',
        'test subject'
      );
      expect(match).toBe(true);
    });

    it('should match when one contains the other', () => {
      const match = (threadReconstructor as any).subjectsMatch(
        'test subject with more words',
        'test subject'
      );
      expect(match).toBe(true);
    });

    it('should match based on word overlap', () => {
      const match = (threadReconstructor as any).subjectsMatch(
        'important project update',
        'project update notification'
      );
      expect(match).toBe(true); // 2/4 words match = 50%, but "project update" is common
    });

    it('should not match unrelated subjects', () => {
      const match = (threadReconstructor as any).subjectsMatch(
        'invoice payment',
        'meeting schedule'
      );
      expect(match).toBe(false);
    });
  });

  describe('buildReferenceChain', () => {
    it('should build reference chain from thread messages', () => {
      const thread = {
        threadId: 'thread-1',
        subject: 'Test Thread',
        participants: ['user1@example.com', 'user2@example.com'],
        messageCount: 3,
        firstMessageDate: new Date('2024-01-01'),
        lastMessageDate: new Date('2024-01-03'),
        messages: [
          {
            id: '1',
            messageId: 'msg-id-1',
            subject: 'Test',
            date: new Date('2024-01-01'),
            from: 'user1@example.com',
          },
          {
            id: '2',
            messageId: 'msg-id-2',
            subject: 'Re: Test',
            date: new Date('2024-01-02'),
            from: 'user2@example.com',
          },
          {
            id: '3',
            messageId: 'msg-id-3',
            subject: 'Re: Test',
            date: new Date('2024-01-03'),
            from: 'user1@example.com',
          },
        ],
      };

      const references = threadReconstructor.buildReferenceChain(thread, 'msg-id-3');
      
      expect(references).toEqual(['msg-id-1', 'msg-id-2']);
    });
  });
}); 