import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, Wrench, Car, ShoppingCart, Siren } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const initialMessages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: 'Hello! I\'m Sparekei AI Concierge, powered by Gemini 2.5 Flash. I can help you with:\n\n• Vehicle maintenance advice\n• Parts recommendations\n• Service booking assistance\n• Emergency guidance\n• Marketplace searches\n\nWhat can I help you with today?', timestamp: new Date().toISOString() },
];

const suggestedPrompts = [
  { icon: Wrench, text: 'When should I change my brake pads?' },
  { icon: Car, text: 'What does a check engine light mean?' },
  { icon: ShoppingCart, text: 'Find brake pads for Toyota Prado' },
  { icon: Siren, text: 'How do I request emergency help?' },
];

export default function AIConciergePage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(r => setTimeout(r, 1500));
    const responses: Record<string, string> = {
      'brake': 'Based on your vehicle profile (Toyota Prado, 45,230 km), I recommend inspecting your brake pads every 20,000 km. At your current mileage, a brake inspection is due. Would you like me to find nearby Class C diagnostic centers or check brake pad availability in the marketplace?',
      'engine': 'A check engine light can indicate various issues from a loose gas cap to serious engine problems. I recommend getting an OBD scan as soon as possible. Would you like me to schedule a diagnostic appointment with a nearby Class C service node?',
      'default': 'I understand your question about "' + input.slice(0, 30) + '...". Let me help you with that. Based on your vehicle profile and location (Nairobi), I can recommend the best course of action. Would you like me to search for relevant services in the marketplace or connect you with a specialist?',
    };
    const responseText = input.toLowerCase().includes('brake') ? responses['brake'] : input.toLowerCase().includes('engine') ? responses['engine'] : responses['default'];
    
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> AI Concierge
        </h1>
        <p className="text-muted-foreground text-sm">Powered by Gemini 2.5 Flash</p>
      </div>

      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", msg.role === 'user' && "flex-row-reverse")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? 'bg-primary/10' : 'bg-accent/10'
              )}>
                {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-accent" />}
              </div>
              <div className={cn("max-w-[80%] rounded-xl p-3 text-sm leading-relaxed",
                msg.role === 'assistant' ? 'bg-muted/50' : 'bg-primary/10'
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce animation-delay-100" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce animation-delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map(p => (
                <button key={p.text} onClick={() => { setInput(p.text); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs hover:bg-primary/10 hover:text-primary transition-colors">
                  <p.icon className="w-3 h-3" />{p.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input 
              placeholder="Ask me anything about your vehicle..." 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
