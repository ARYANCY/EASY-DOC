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
    <div className={cn('editorial-card flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e8e1d8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#a77a35]" />
          <h2 className="font-editorial text-2xl text-[#181715]">AI Legal Assistant</h2>
        </div>
        <button className="text-[#777169] hover:text-[#181715]">
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
                  ? 'bg-[#181715] text-[#fffdf9]'
                  : 'bg-[#f0ebe3] text-[#181715]'
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
                  ? 'bg-[#181715] text-[#fffdf9]'
                  : 'bg-[#f7f4ef] text-[#3f3a35]'
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-[#f0ebe3] text-[#181715] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#f7f4ef] p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#181715] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#181715] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#181715] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-5 py-3 border-t border-[#e8e1d8] bg-[#f7f4ef]/60">
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
                className="px-3 py-1.5 text-xs bg-[#fffdf9] border border-[#e8e1d8] text-[#181715] hover:border-[#181715] transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#e8e1d8]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask anything about this document..."
            className="flex-1 px-4 py-2.5 border border-[#e8e1d8] bg-[#fffdf9] focus:outline-none focus:ring-1 focus:ring-[#181715] focus:border-[#181715] text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-[#181715] text-[#fffdf9] hover:bg-[#a77a35] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
