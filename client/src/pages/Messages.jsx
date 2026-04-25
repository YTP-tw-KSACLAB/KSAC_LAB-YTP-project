import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Messages() {
  const { parseJsonSafely } = useAppContext();
  
  const friendsList = [
    { id: 'ai-agent', name: 'AI Travel Agent', subtitle: 'Always online', avatar: '🤖', isAi: true },
    { id: 'foodie-tpe', name: 'foodie.tpe', subtitle: 'Sent a reel', avatar: 'F', isAi: false, messages: [
      { sender: 'them', text: 'Hey, did you see the new night market map?' },
      { sender: 'me', text: 'Yeah! Looks awesome.' }
    ]},
    { id: 'legal-stay', name: 'legal.stay.tw', subtitle: 'Active 2h ago', avatar: 'L', isAi: false, messages: [
      { sender: 'them', text: 'Don\'t forget to check the B&B registration number!' }
    ]},
  ];

  const [activeChatId, setActiveChatId] = useState('ai-agent');
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const activeChat = friendsList.find(f => f.id === activeChatId);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (activeChat.isAi) {
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
    } else {
      // Mock friend message send
      setChatInput('');
      alert("This is a dummy conversation.");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatId]);

  return (
    <div className="messages-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 4rem)', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      
      {/* Left Pane: Chat List */}
      <div className="chat-list-pane" style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Messages</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {friendsList.map(friend => (
            <button 
              key={friend.id}
              onClick={() => setActiveChatId(friend.id)}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                background: activeChatId === friend.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s'
              }}
            >
              <div className="avatar mini" style={{ margin: 0, fontSize: friend.isAi ? '1.2rem' : '0.9rem' }}>{friend.avatar}</div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>{friend.name}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Pane: Active Chat */}
      <div className="active-chat-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {activeChat ? (
          <>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="avatar mini" style={{ margin: 0 }}>{activeChat.avatar}</div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{activeChat.name}</h2>
              {activeChat.isAi && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#8b5cf6', fontSize: '0.7rem' }}>AI</span>}
            </div>

            <div className="chat-window" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeChat.isAi ? (
                <>
                  {chatMessages.length === 0 && <p className="chat-empty" style={{ margin: 'auto' }}>Ask me to plan a route or recommend a spot!</p>}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'model'}`} style={{ maxWidth: '70%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                      {msg.text}
                    </div>
                  ))}
                  {isChatLoading && <div className="chat-bubble model typing" style={{ alignSelf: 'flex-start' }}>Agent is typing...</div>}
                </>
              ) : (
                <>
                  {activeChat.messages.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.sender === 'me' ? 'user' : 'model'}`} style={{ maxWidth: '70%', alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                      {msg.text}
                    </div>
                  ))}
                  <div style={{ margin: 'auto', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{fontSize: '0.8rem', color: '#94a3b8', margin: 0}}>✨ AI Feature: "Smart Reply" coming soon!</p>
                  </div>
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="chat-form" onSubmit={handleSendChat} style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', background: 'transparent' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder={`Message ${activeChat.name}...`} 
                style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
              />
              <button type="submit" disabled={activeChat.isAi && isChatLoading} style={{ borderRadius: '24px', padding: '0 1.5rem', background: '#3b82f6' }}>Send</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#94a3b8' }}>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

    </div>
  );
}
