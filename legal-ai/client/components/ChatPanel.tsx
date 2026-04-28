'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils/cn';
import { sendChatMessage } from '../features/chat/chatService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  documentId?: string;
  className?: string;
}

export default function ChatPanel({ documentId, className }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Legal Assistant. Ask me anything about this document.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(input, documentId);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer || 'I apologize, but I could not process your question at this time.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900">AI Legal Assistant</h2>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-600'
              )}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] p-3 rounded-lg text-sm leading-relaxed',
                message.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-2">
            {[
              'What happens if the other party breaches the agreement?',
              'Is there any payment obligation in this agreement?',
            ].map((question) => (
              <button
                key={question}
                onClick={() => {
                  setInput(question);
                }}
                className="px-3 py-1.5 text-xs bg-white border border-purple-200 text-purple-700 rounded-full hover:bg-purple-50 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask anything about this document..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
