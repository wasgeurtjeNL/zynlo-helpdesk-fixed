'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@zynlo/supabase';
import { AlertTriangle, Shield, RefreshCw, Loader2 } from 'lucide-react';

interface TicketLoadingDebugProps {
  ticketNumber: number;
}

export function TicketLoadingDebug({ ticketNumber }: TicketLoadingDebugProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [mixedContentIssues, setMixedContentIssues] = useState<string[]>([]);
  const startTime = Date.now();

  const addLog = (message: string) => {
    const elapsed = Date.now() - startTime;
    setLogs((prev) => [...prev, `[${elapsed}ms] ${message}`]);
  };

  // Monitor console errors for mixed content
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Mixed Content') || message.includes('insecure')) {
        setMixedContentIssues((prev) => [...prev, message]);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const { data, error, isLoading, isFetching, isStale, dataUpdatedAt } = useQuery({
    queryKey: ['ticket-debug', ticketNumber],
    queryFn: async () => {
      addLog('Starting ticket fetch...');

      try {
        // Fetch ticket
        addLog('Fetching ticket data...');
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('number', ticketNumber)
          .single();

        if (ticketError) {
          addLog(`Ticket fetch error: ${ticketError.message}`);
          throw ticketError;
        }

        addLog(`Ticket fetched: ${ticket.id}`);

        // Fetch conversation
        addLog('Fetching conversation...');
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('ticket_id', ticket.id)
          .single();

        if (convError) {
          addLog(`Conversation error: ${convError.message}`);
        } else {
          addLog(`Conversation fetched: ${conversation?.id}`);
        }

        // Fetch messages
        if (conversation) {
          addLog('Fetching messages...');
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            addLog(`Messages error: ${msgError.message}`);
          } else {
            addLog(`Messages fetched: ${messages?.length || 0} messages`);

            // Check for HTTP links in content
            messages?.forEach((msg, index) => {
              const httpLinks = msg.content.match(/http:\/\/[^\s<>"']+/g) || [];
              if (httpLinks.length > 0) {
                addLog(`Message ${index + 1} contains ${httpLinks.length} HTTP links`);
                httpLinks.forEach((link) => {
                  setMixedContentIssues((prev) => [...prev, `HTTP link in content: ${link}`]);
                });
              }
            });
          }

          return { ticket, conversation, messages };
        }

        return { ticket, conversation: null, messages: [] };
      } catch (err) {
        addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        throw err;
      }
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider stale for debugging
  });

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Loading Debug - Ticket #{ticketNumber}
        </h3>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-80">
        {/* Loading State */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Loading:</span>
            <span className={isLoading ? 'text-yellow-500' : 'text-green-500'}>
              {isLoading ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Fetching:</span>
            <span className={isFetching ? 'text-yellow-500' : 'text-green-500'}>
              {isFetching ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Data Stale:</span>
            <span className={isStale ? 'text-yellow-500' : 'text-green-500'}>
              {isStale ? 'Yes' : 'No'}
            </span>
          </div>
          {dataUpdatedAt > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Last Updated:</span>
              <span className="text-gray-600">{new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Mixed Content Issues */}
        {mixedContentIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Mixed Content Issues ({mixedContentIssues.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {mixedContentIssues.map((issue, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query Error */}
        {error && (
          <div className="bg-red-50 p-3 rounded">
            <h4 className="font-medium text-red-600 mb-1">Query Error</h4>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Fetch Logs */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Fetch Timeline</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-600">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Data Summary */}
        {data && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Data Summary</h4>
            <div className="text-sm space-y-1">
              <div>✓ Ticket ID: {data.ticket.id}</div>
              <div>✓ Conversation: {data.conversation ? 'Found' : 'Not found'}</div>
              <div>✓ Messages: {data.messages?.length || 0}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t bg-gray-50">
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Hard Refresh (Ctrl+F5)
        </button>
      </div>
    </div>
  );
}
