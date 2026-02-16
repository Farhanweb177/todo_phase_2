'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { getConversations, type Conversation } from '@/services/chat';
import LoadingSpinner from '@/components/LoadingSpinner';

// For Phase 3 (no auth), use a hardcoded or URL-param userId
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || DEFAULT_USER_ID;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convos = await getConversations(userId);
        setConversations(convos);
      } catch {
        // Silently fail — user can still start a new conversation
      }
    };
    loadConversations();
  }, [userId]);

  const refreshConversations = async () => {
    try {
      const convos = await getConversations(userId);
      setConversations(convos);
    } catch {
      // Silently fail
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(undefined);
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
    refreshConversations();
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r bg-gray-50 flex flex-col shrink-0">
          <div className="p-3 border-b">
            <button
              onClick={handleNewConversation}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
            >
              + New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-3 text-sm border-b hover:bg-gray-100 transition-colors ${
                  selectedConversationId === conv.id
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : ''
                }`}
              >
                <p className="font-medium truncate">
                  {conv.title || 'New conversation'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="p-3 text-sm text-gray-400 text-center">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Todo Assistant</h1>
        </div>

        {/* Chat interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            key={selectedConversationId || 'new'}
            userId={userId}
            conversationId={selectedConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner size="lg" message="Loading chat..." />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
