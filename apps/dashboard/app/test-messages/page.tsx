'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@zynlo/supabase';

export default function TestMessagesPage() {
  const [data, setData] = useState<any>({
    tickets: [],
    conversations: [],
    messages: [],
    ticketsWithMessages: [],
    loading: true,
    error: null,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch tickets
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, number, subject')
          .limit(5);

        if (ticketsError) throw ticketsError;

        // Fetch conversations
        const { data: conversations, error: conversationsError } = await supabase
          .from('conversations')
          .select('id, ticket_id, channel')
          .limit(5);

        if (conversationsError) throw conversationsError;

        // Fetch messages
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, conversation_id, content, sender_type, created_at')
          .limit(10);

        if (messagesError) throw messagesError;

        // Fetch ALL tickets that have conversations with messages
        const { data: ticketsWithMessages, error: joinError } = await supabase
          .from('tickets')
          .select(
            `
            id,
            number,
            subject,
            conversations!inner(
              id,
              channel,
              messages!inner(
                id,
                content,
                sender_type
              )
            )
          `
          )
          .limit(10);

        if (joinError) {
          console.error('Join query error:', joinError);
        }

        setData({
          tickets: tickets || [],
          conversations: conversations || [],
          messages: messages || [],
          ticketsWithMessages: ticketsWithMessages || [],
          loading: false,
          error: null,
        });
      } catch (error) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    fetchData();
  }, []);

  const createTestConversation = async (ticketId: string) => {
    setCreating(true);
    try {
      // First, check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticketId)
        .single();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            ticket_id: ticketId,
            channel: 'email',
            external_id: `test-${Date.now()}`,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create a test message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: 'This is a test message created to verify the system is working.',
        sender_type: 'customer',
        sender_id: 'test-customer',
        metadata: {
          from: {
            email: 'test@example.com',
            name: 'Test Customer',
          },
        },
      });

      if (msgError) throw msgError;

      alert('Test conversation and message created successfully! Refresh the page to see updates.');
      window.location.reload();
    } catch (error) {
      console.error('Error creating test data:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  if (data.loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (data.error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600">Error</h1>
        <p>{data.error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Database Debug</h1>

      <div>
        <h2 className="text-xl font-semibold mb-2">Tickets ({data.tickets.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(data.tickets, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Conversations ({data.conversations.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(data.conversations, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Messages ({data.messages.length})</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(data.messages, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Ticket → Conversation → Messages Mapping</h2>
        {data.tickets.map((ticket: any) => {
          const conversation = data.conversations.find((c: any) => c.ticket_id === ticket.id);
          const conversationMessages = conversation
            ? data.messages.filter((m: any) => m.conversation_id === conversation.id)
            : [];

          return (
            <div key={ticket.id} className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold">
                Ticket #{ticket.number}: {ticket.subject}
              </h3>
              <p>Conversation ID: {conversation?.id || 'No conversation'}</p>
              <p>Messages: {conversationMessages.length}</p>
              {!conversation && (
                <button
                  onClick={() => createTestConversation(ticket.id)}
                  disabled={creating}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Test Conversation & Message'}
                </button>
              )}
              {conversationMessages.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {conversationMessages.map((msg: any) => (
                    <li key={msg.id} className="text-sm text-gray-600">
                      {msg.sender_type}: {msg.content.substring(0, 50)}...
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="text-xl font-semibold mb-2 text-yellow-800">⚠️ Orphaned Conversations</h2>
        <p className="text-sm text-yellow-700 mb-4">
          These conversations exist but their tickets are not in the current list:
        </p>
        {data.conversations
          .filter((c: any) => !data.tickets.find((t: any) => t.id === c.ticket_id))
          .map((conv: any) => {
            const convMessages = data.messages.filter((m: any) => m.conversation_id === conv.id);
            return (
              <div key={conv.id} className="mb-2 text-sm">
                <p>
                  <strong>Conversation {conv.id}</strong> (channel: {conv.channel})
                </p>
                <p>Ticket ID: {conv.ticket_id} (not found in current tickets)</p>
                <p>Messages: {convMessages.length}</p>
              </div>
            );
          })}
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
        <h2 className="text-xl font-semibold mb-2 text-green-800">✅ Tickets WITH Messages</h2>
        <p className="text-sm text-green-700 mb-4">
          These tickets have proper conversation → message relationships:
        </p>
        {data.ticketsWithMessages && data.ticketsWithMessages.length > 0 ? (
          data.ticketsWithMessages.map((ticket: any) => (
            <div key={ticket.id} className="mb-4 p-3 bg-white rounded">
              <h3 className="font-semibold">
                Ticket #{ticket.number}: {ticket.subject}
              </h3>
              <p className="text-sm text-gray-600">Ticket ID: {ticket.id}</p>
              {ticket.conversations?.map((conv: any) => (
                <div key={conv.id} className="ml-4 mt-2">
                  <p className="text-sm">
                    Conversation ({conv.channel}): {conv.messages?.length || 0} messages
                  </p>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">No tickets found with messages</p>
        )}
      </div>

      {/* Add specific ticket 611 debug info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-xl font-semibold mb-2 text-blue-800">🔍 Debug Ticket #611</h2>
        <button
          onClick={async () => {
            // Fetch specific ticket 611 data
            const { data: ticket } = await supabase
              .from('tickets')
              .select('*')
              .eq('number', 611)
              .single();

            const { data: conversation } = await supabase
              .from('conversations')
              .select('*')
              .eq('ticket_id', ticket?.id)
              .single();

            const { data: allMessages } = await supabase
              .from('messages')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(20);

            const { data: messagesForConv } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversation?.id);

            console.log('🎫 Ticket 611:', ticket);
            console.log('🗨️ Conversation:', conversation);
            console.log('📨 Messages for this conversation:', messagesForConv);
            console.log('📬 All recent messages:', allMessages);

            alert(`
Ticket #611 Debug:
- Ticket ID: ${ticket?.id}
- Conversation ID: ${conversation?.id}
- Messages in conversation: ${messagesForConv?.length || 0}
- Total messages in DB: ${allMessages?.length || 0}

Check console for details!
            `);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Debug Ticket #611
        </button>

        <button
          onClick={async () => {
            // First get ticket 611
            const { data: ticket } = await supabase
              .from('tickets')
              .select('*')
              .eq('number', 611)
              .single();

            if (!ticket) {
              alert('Ticket 611 not found!');
              return;
            }

            // Get or create conversation
            let { data: conversation } = await supabase
              .from('conversations')
              .select('*')
              .eq('ticket_id', ticket.id)
              .single();

            if (!conversation) {
              // Create conversation
              const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                  ticket_id: ticket.id,
                  channel: 'email',
                  external_id: `email-${ticket.id}`,
                })
                .select()
                .single();

              if (convError) {
                alert('Error creating conversation: ' + convError.message);
                return;
              }
              conversation = newConv;
            }

            // Create test messages
            const messages = [
              {
                conversation_id: conversation.id,
                content: 'Hallo, ik heb een vraag over de Cooling Bundle aanbieding.',
                sender_type: 'customer',
                sender_id: ticket.customer_id || 'customer-1',
              },
              {
                conversation_id: conversation.id,
                content:
                  'Bedankt voor uw bericht! De Cooling Bundle met 30% korting is geldig tot het einde van deze maand.',
                sender_type: 'agent',
                sender_id: 'agent-1',
              },
              {
                conversation_id: conversation.id,
                content: 'Perfect, dan bestel ik hem vandaag nog!',
                sender_type: 'customer',
                sender_id: ticket.customer_id || 'customer-1',
              },
            ];

            const { error: msgError } = await supabase.from('messages').insert(messages);

            if (msgError) {
              alert('Error creating messages: ' + msgError.message);
              return;
            }

            alert('✅ Created 3 test messages for ticket 611! Refresh the ticket to see them.');
          }}
          className="ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create Test Messages for #611
        </button>
      </div>
    </div>
  );
}
