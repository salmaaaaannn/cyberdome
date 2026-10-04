'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '@/services';
import { AIMessage } from '@/types';
import { Bot, Send, Sparkles, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const suggestedPrompts = [
  'What threats are active?',
  'Explain the latest critical incident',
  'Show today\'s attack timeline',
  'Explain this fusion alert',
  'Summarize today\'s security posture',
  'Create a response plan',
];

export default function AIPage() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'sys-1',
      role: 'system',
      content: 'CyberDome AI Security Intelligence Copilot online. I have live context across your external attack surface, active CVEs, endpoint telemetry, and incident queues. How can I assist your investigation?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await aiService.sendMessage(text);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to communicate with the AI Backend. Your security data has not been modified.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Premium Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(255,23,68,0.2) 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              color: '#A855F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(168,85,247,0.15)',
            }}
          >
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              CYBERDOME AI COPILOT
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
              Context-aware security assistant powered by RAG and Gemini AI
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: '#A855F7',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A855F7', boxShadow: '0 0 8px #A855F7', animation: 'pulse 2s infinite' }} />
            AI ONLINE
          </span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div
        className="cyber-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <AnimatePresence>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(168,85,247,0.1)',
                        border: '1px solid rgba(168,85,247,0.2)',
                        color: '#A855F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    >
                      <Terminal size={18} />
                    </div>
                  )}

                  <div
                    style={{
                      background: isUser ? 'rgba(255,23,68,0.1)' : 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: isUser ? '1px solid rgba(255,23,68,0.3)' : '1px solid var(--border-subtle)',
                      padding: '16px 20px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#A855F7',
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.08em',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Sparkles size={12} /> CYBERDOME INTELLIGENCE
                      </div>
                    )}
                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: isUser ? 'var(--font-body)' : 'inherit',
                    }}>
                      {/* We use ReactMarkdown to render the Gemini markdown nicely */}
                      {isUser ? msg.content : (
                        <div className="markdown-body">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 16, alignItems: 'center' }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  color: '#A855F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Terminal size={18} />
              </div>
              <div style={{ color: '#A855F7', fontSize: 13, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ANALYZING SECURITY CONTEXT
                <span className="loading-dots">...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(prompt)}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168,85,247,0.1)';
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                e.currentTarget.style.color = '#A855F7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-subtle)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-primary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '6px 6px 6px 16px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#A855F7';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(168,85,247,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask the AI Security Copilot..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14.5,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              style={{
                background: input.trim() ? 'var(--cyberdome-red)' : 'var(--bg-subtle)',
                color: input.trim() ? '#FFFFFF' : 'var(--text-muted)',
                border: 'none',
                width: 36,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Grounded exclusively on verified CYBERDOME security telemetry. Zero data fabrication.
          </div>
        </div>
      </div>
    </div>
  );
}
