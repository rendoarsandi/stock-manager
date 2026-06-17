import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

export default function Chat() {
  const { currentUser } = useAuth();
  const { addWsListener, sendWsMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (currentUser && isConnected) {
      sendWsMessage({ type: 'IDENTIFY', userId: currentUser.id });
    }
  }, [currentUser, isConnected, sendWsMessage]);

  // Contacts and active conversation states
  const [contacts, setContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [activeChats, setActiveChats] = useState([]); // List of user IDs currently open in chat windows
  const [minimizedChats, setMinimizedChats] = useState([]); // List of user IDs currently minimized
  const [messages, setMessages] = useState({}); // Map of otherUserId -> array of message objects
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  
  // Tagging product states per chat box: otherUserId -> product object or null
  const [taggedProducts, setTaggedProducts] = useState({});
  const [showProductDropdown, setShowProductDropdown] = useState({}); // otherUserId -> boolean
  const [searchProductQuery, setSearchProductQuery] = useState({}); // otherUserId -> string
  const [chatInputs, setChatInputs] = useState({}); // otherUserId -> message input string

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const messagesEndRefs = useRef({});
  const activeChatsRef = useRef([]);
  const messagesRef = useRef({});
  const contactsRef = useRef([]);

  // Keep refs in sync to prevent stale closures in the WebSocket listener
  useEffect(() => {
    activeChatsRef.current = activeChats;
  }, [activeChats]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/chat/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat contacts:', err);
    }
  }, [currentUser]);

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        // Exclude current user
        setAllUsers(data.filter(u => u.id !== currentUser.id));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [currentUser]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProductsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [currentUser]);

  // Load initial data
  useEffect(() => {
    if (currentUser) {
      fetchContacts();
      fetchAllUsers();
      fetchProducts();
    }
  }, [currentUser, fetchContacts, fetchAllUsers, fetchProducts]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((userId) => {
    setTimeout(() => {
      if (messagesEndRefs.current[userId]) {
        messagesEndRefs.current[userId].scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  // Fetch messages for a specific user conversation
  const fetchMessages = useCallback(async (otherUserId) => {
    try {
      const res = await fetch(`/api/chat/messages?other_user_id=${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => ({
          ...prev,
          [otherUserId]: data
        }));
        scrollToBottom(otherUserId);
      }
    } catch (err) {
      console.error(`Failed to fetch messages for user ${otherUserId}:`, err);
    }
  }, [scrollToBottom]);

  // Mark messages as read
  const markAsRead = useCallback(async (senderId) => {
    try {
      const res = await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId })
      });
      if (res.ok) {
        setContacts(prev =>
          prev.map(c => c.id === senderId ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch (err) {
      console.error(`Failed to mark messages as read for user ${senderId}:`, err);
    }
  }, []);

  // WebSocket Listener
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = addWsListener((data) => {
      if (data.type === 'CHAT_MESSAGE') {
        if (data.receiver_id === currentUser.id) {
          const isChatWindowOpen = activeChatsRef.current.includes(data.sender_id);
          
          if (isChatWindowOpen) {
            // Append to messages list
            setMessages(prev => {
              const list = prev[data.sender_id] || [];
              if (list.some(m => m.id === data.id)) return prev;
              return {
                ...prev,
                [data.sender_id]: [...list, data]
              };
            });
            scrollToBottom(data.sender_id);
            // Mark read on server
            markAsRead(data.sender_id);
          } else {
            // Not open, show toast and increment unread in contacts
            setContacts(prev => {
              const existing = prev.find(c => c.id === data.sender_id);
              if (existing) {
                return prev.map(c => c.id === data.sender_id ? {
                  ...c,
                  last_message: data.message,
                  last_message_time: data.created_at,
                  unread_count: c.unread_count + 1
                } : c).sort((a, b) => b.last_message_time.localeCompare(a.last_message_time));
              } else {
                fetchContacts();
                return prev;
              }
            });

            // Create notification pop out toast
            const toastId = Date.now() + Math.random();
            const newToast = {
              id: toastId,
              sender_id: data.sender_id,
              sender_username: data.sender_username,
              message: data.message,
              product: data.product
            };
            setToasts(prev => [...prev, newToast]);
            
            // Auto close toast after 6 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 6000);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, addWsListener, fetchContacts, markAsRead, scrollToBottom]);

  // Open conversation
  const openChat = useCallback((userId) => {
    setActiveChats(prev => {
      if (prev.includes(userId)) return prev;
      return [...prev.filter(id => id !== userId).slice(-2), userId];
    });
    fetchMessages(userId);
    // Remove from minimized
    setMinimizedChats(prev => prev.filter(id => id !== userId));
    // Clear unread indicator and mark read
    markAsRead(userId);
    // Auto scroll
    scrollToBottom(userId);
    // Close user selector
    setShowUserSelector(false);
  }, [fetchMessages, markAsRead, scrollToBottom]);

  // Close conversation
  const closeChat = useCallback((userId) => {
    setActiveChats(prev => prev.filter(id => id !== userId));
    setMinimizedChats(prev => prev.filter(id => id !== userId));
  }, []);

  // Minimize toggle
  const toggleMinimize = useCallback((userId) => {
    setMinimizedChats(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }, []);

  // Send message
  const sendMessage = async (otherUserId) => {
    const inputVal = chatInputs[otherUserId] || '';
    const taggedProduct = taggedProducts[otherUserId];

    if (!inputVal.trim() && !taggedProduct) return;

    try {
      const payload = {
        receiver_id: otherUserId,
        message: inputVal,
        product_id: taggedProduct ? taggedProduct.id : null
      };

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newMsg = await res.json();
        
        // Populate product locally
        if (taggedProduct) {
          newMsg.product_name = taggedProduct.name;
          newMsg.product_model = taggedProduct.model;
          newMsg.product_current_stock = taggedProduct.current_stock;
        }

        // Add to messages locally
        setMessages(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), newMsg]
        }));

        // Clear input and tagged product for this user
        setChatInputs(prev => ({ ...prev, [otherUserId]: '' }));
        setTaggedProducts(prev => ({ ...prev, [otherUserId]: null }));
        scrollToBottom(otherUserId);

        // Update contacts last message
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e, otherUserId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(otherUserId);
    }
  };

  // Filter contacts/users
  const filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  return (
    <>
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => {
              openChat(t.sender_id);
              setToasts(prev => prev.filter(x => x.id !== t.id));
            }}
            className="pointer-events-auto bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-zinc-800/80 flex flex-col gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-zinc-950/20 active:scale-[0.98] animate-slide-in animate-duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-400 tracking-wider uppercase">💬 New Message</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(x => x.id !== t.id));
                }}
                className="text-zinc-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-800/60"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-sm text-zinc-100">{t.sender_username}</div>
            <div className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{t.message}</div>
            {t.product && (
              <div className="mt-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] flex items-center gap-2">
                <span className="text-emerald-400">📦</span>
                <span className="font-medium text-zinc-300 truncate">{t.product.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Chat System */}
      <div className="fixed bottom-0 right-4 z-50 flex items-end gap-4 pointer-events-none select-none">
        
        {/* Active Chat Windows (Facebook style) */}
        {activeChats.map(userId => {
          const otherUser = allUsers.find(u => u.id === userId) || contacts.find(u => u.id === userId);
          const name = otherUser?.username || `User #${userId}`;
          const isMinimized = minimizedChats.includes(userId);
          const conversationMessages = messages[userId] || [];
          const taggedProd = taggedProducts[userId];
          const showProdDropdown = !!showProductDropdown[userId];
          const prodSearch = searchProductQuery[userId] || '';
          const inputVal = chatInputs[userId] || '';

          // Filter product search
          const filteredProducts = productsList.filter(p =>
            p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
            p.model.toLowerCase().includes(prodSearch.toLowerCase())
          ).slice(0, 5);

          return (
            <div
              key={userId}
              className={`pointer-events-auto w-80 bg-white dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/90 rounded-t-xl shadow-2xl flex flex-col transition-all duration-300 ${
                isMinimized ? 'h-11' : 'h-[26rem]'
              }`}
            >
              {/* Chat Header */}
              <div
                onClick={() => toggleMinimize(userId)}
                className="bg-zinc-900 dark:bg-zinc-850 text-white px-4 py-2.5 flex items-center justify-between rounded-t-xl cursor-pointer hover:bg-zinc-850 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2.5 font-medium text-xs tracking-wider uppercase truncate">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="truncate text-zinc-100">{name}</span>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleMinimize(userId)}
                    className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    {isMinimized ? '▲' : '—'}
                  </button>
                  <button
                    onClick={() => closeChat(userId)}
                    className="hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20 select-text flex flex-col custom-scrollbar">
                    {conversationMessages.length === 0 ? (
                      <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 my-auto">
                        No messages yet. Say hello!
                      </div>
                    ) : (
                      conversationMessages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${
                              isMe ? 'self-end items-end' : 'self-start items-start'
                            }`}
                          >
                            <div
                              className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                                isMe
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-none'
                                  : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700/50'
                              }`}
                            >
                              <div>{msg.message}</div>
                              
                              {/* Product Tag Badge Inside Bubble */}
                              {msg.product_name && (
                                <div className="mt-2 p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl text-[11px] flex flex-col gap-1 w-52 select-none shadow-inner">
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                                    <span>📦</span> {msg.product_name}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                                    Model: {msg.product_model}
                                  </div>
                                  <div className="flex justify-between items-center mt-1.5 text-[10px] pt-1 border-t border-zinc-100 dark:border-zinc-800/40">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      Stock: {msg.product_current_stock}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">Tagged</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 px-1 font-medium">
                              {msg.created_at ? msg.created_at.split(' ')[1] || msg.created_at : ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={el => messagesEndRefs.current[userId] = el} />
                  </div>

                  {/* Input Footer */}
                  <div className="p-3 border-t border-zinc-150 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 relative">
                    
                    {/* Tagged Product Preview Bar */}
                    {taggedProd && (
                      <div className="mb-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center animate-slide-up">
                        <span className="truncate font-semibold flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                          <span>🏷️</span> Tagged: {taggedProd.name}
                        </span>
                        <button
                          onClick={() => setTaggedProducts(prev => ({ ...prev, [userId]: null }))}
                          className="text-zinc-400 hover:text-zinc-750 dark:hover:text-white font-bold ml-2 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Product Selection Dropdown Popover */}
                    {showProdDropdown && (
                      <div className="absolute bottom-full left-2 right-2 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2 animate-slide-up">
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tag Product Item</span>
                          <button
                            onClick={() => setShowProductDropdown(prev => ({ ...prev, [userId]: false }))}
                            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Search product name..."
                          value={prodSearch}
                          onChange={(e) => setSearchProductQuery(prev => ({ ...prev, [userId]: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-transparent transition-all"
                          autoFocus
                        />
                        <div className="max-h-36 overflow-y-auto mt-1 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/40 custom-scrollbar">
                          {filteredProducts.length === 0 ? (
                            <div className="text-[10px] text-zinc-450 text-center py-3">No products found</div>
                          ) : (
                            filteredProducts.map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setTaggedProducts(prev => ({ ...prev, [userId]: p }));
                                  setShowProductDropdown(prev => ({ ...prev, [userId]: false }));
                                  setSearchProductQuery(prev => ({ ...prev, [userId]: '' }));
                                }}
                                className="text-left text-xs px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-850/60 rounded-lg flex flex-col gap-0.5 truncate transition-all"
                              >
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.name}</span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Model: {p.model} | Stock: {p.current_stock}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Input Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowProductDropdown(prev => ({ ...prev, [userId]: !prev[userId] }))}
                        title="Tag a product item"
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all active:scale-95"
                      >
                        🏷️
                      </button>
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={inputVal}
                        onChange={(e) => setChatInputs(prev => ({ ...prev, [userId]: e.target.value }))}
                        onKeyDown={(e) => handleKeyDown(e, userId)}
                        className="flex-1 px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 transition-all"
                      />
                      <button
                        onClick={() => sendMessage(userId)}
                        disabled={!inputVal.trim() && !taggedProd}
                        className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 transition-all active:scale-95"
                      >
                        ➔
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Contacts Roster/List Dock or Plus Button */}
        {contacts.length === 0 ? (
          /* User never chatted to anyone: Show float round "+" Button */
          <div className="pointer-events-auto relative mb-4 mr-2">
            {showUserSelector && (
              <div className="absolute bottom-full right-0 mb-3 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 animate-slide-up flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Start a chat with...</span>
                  <button
                    onClick={() => setShowUserSelector(false)}
                    className="text-zinc-400 hover:text-zinc-650 dark:hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search username..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-450 transition-all"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto mt-1 flex flex-col gap-1 custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <div className="text-xs text-zinc-400 text-center py-4">No users found</div>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => openChat(u.id)}
                        className="text-left text-xs px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg flex items-center gap-2 font-medium transition-all"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-650"></span>
                        {u.username}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowUserSelector(prev => !prev)}
              title="Start new chat conversation"
              className="w-12 h-12 rounded-full bg-zinc-950 dark:bg-zinc-100 hover:scale-105 active:scale-95 text-white dark:text-zinc-900 flex items-center justify-center shadow-xl transition-all cursor-pointer font-bold text-xl"
            >
              +
            </button>
          </div>
        ) : (
          /* User already talked to someone: Show Facebook style chat bar roster */
          <div
            className={`pointer-events-auto w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-t-xl shadow-2xl flex flex-col transition-all duration-300 ${
              contactsExpanded ? 'h-80' : 'h-11'
            }`}
          >
            {/* Roster Header */}
            <div
              onClick={() => setContactsExpanded(prev => !prev)}
              className="bg-zinc-950 dark:bg-zinc-850 text-white px-4 py-3 flex items-center justify-between rounded-t-xl cursor-pointer hover:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="font-semibold text-[10px] tracking-wider uppercase text-zinc-200">Conversations</span>
              <div className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowUserSelector(prev => !prev)}
                  title="New Conversation"
                  className="hover:bg-white/10 w-5 h-5 flex items-center justify-center rounded-md text-sm font-bold text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                  +
                </button>
                <span className="text-[10px] text-zinc-400">{contactsExpanded ? '▼' : '▲'}</span>
              </div>
            </div>

            {/* Roster Contact List */}
            {contactsExpanded && (
              <div className="flex-1 overflow-y-auto p-1.5 relative flex flex-col custom-scrollbar">
                
                {/* User Selector Dropdown in Contact List */}
                {showUserSelector && (
                  <div className="absolute top-1 left-1.5 right-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2 animate-slide-down">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">New Message</span>
                      <button
                        onClick={() => setShowUserSelector(false)}
                        className="text-zinc-450 hover:text-zinc-700 dark:hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Type username..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-450 transition-all"
                      autoFocus
                    />
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5 mt-1 custom-scrollbar">
                      {filteredUsers.length === 0 ? (
                        <div className="text-[10px] text-zinc-400 text-center py-2">No users found</div>
                      ) : (
                        filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => openChat(u.id)}
                            className="text-left text-xs px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg flex items-center gap-2 font-medium transition-all"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-650"></span>
                            {u.username}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Contact List */}
                <div className="flex flex-col gap-1">
                  {contacts.map(c => {
                    const isOpen = activeChats.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => openChat(c.id)}
                        className={`w-full text-left p-2 hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-all flex items-center justify-between rounded-lg ${
                          isOpen ? 'bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-150 dark:border-zinc-800' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                              {c.username}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-medium leading-normal">
                              {c.last_message || 'Start conversation...'}
                            </div>
                          </div>
                        </div>

                        {/* Unread badge */}
                        {c.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shadow-sm">
                            {c.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
