import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Messages() {
  const { parseJsonSafely } = useAppContext();
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsgs = [...chatMessages, { sender: 'user', text: chatInput }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await parseJsonSafely(response);
      setChatMessages([...newMsgs, { sender: 'model', text: data.reply || 'Sorry, I am offline.' }]);
    } catch (err) {
      setChatMessages([...newMsgs, { sender: 'model', text: 'Error connecting to agent.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <article className="post-card status-panel chat-container" style={{ height: 'calc(100vh - 4rem)' }}>
      <h3>AI Travel Agent</h3>
      <div className="chat-window" style={{ flex: 1 }}>
        {chatMessages.length === 0 && <p className="chat-empty">Send a message to start planning!</p>}
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isChatLoading && <div className="chat-bubble model typing">Agent is typing...</div>}
        <div ref={chatEndRef} />
      </div>
      <form className="chat-form" onSubmit={handleSendChat}>
        <input 
          type="text" 
          value={chatInput} 
          onChange={(e) => setChatInput(e.target.value)} 
          placeholder="Ask about Taipei..." 
        />
        <button type="submit" disabled={isChatLoading}>Send</button>
      </form>
    </article>
  );
}
