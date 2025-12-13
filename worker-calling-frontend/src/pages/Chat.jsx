import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/chatService';
import workerService from '../services/workerService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const Chat = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      await fetchConversations();
    };
    
    initializeChat();
  }, []);

  // Handle loading conversation when URL parameter changes
  useEffect(() => {
    const userIdFromUrl = searchParams.get('user');
    if (userIdFromUrl && !loading) {
      // Small delay to ensure conversations are loaded
      const timer = setTimeout(() => {
        loadConversation(userIdFromUrl);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (userId) => {
    try {
      // First, try to get conversation messages
      const messagesResponse = await chatService.getConversation(userId);
      let messagesData = [];
      if (messagesResponse.success) {
        messagesData = messagesResponse.data;
      }
      
      // Always fetch fresh user/worker details to ensure we have correct info
      // This is especially important when coming from URL parameter
      let conversation = conversations.find(c => c.user_id === userId);
      let fetchedConversation = null;
      
      try {
        // Try to get worker details first (most common case from worker profile page)
        const workerResponse = await workerService.getWorkerById(userId);
        if (workerResponse.success && workerResponse.data) {
          fetchedConversation = {
            user_id: userId,
            full_name: workerResponse.data.full_name,
            profile_photo: workerResponse.data.profile_photo,
            unread_count: 0,
          };
        }
      } catch (workerError) {
        // Not a worker or error fetching, try regular user
        try {
          const userResponse = await api.get(`/api/users/${userId}`);
          if (userResponse.data.success && userResponse.data.data) {
            fetchedConversation = {
              user_id: userId,
              full_name: userResponse.data.data.full_name,
              profile_photo: userResponse.data.data.profile_photo,
              unread_count: 0,
            };
          }
        } catch (userError) {
          console.log('Could not fetch user details:', userError);
        }
      }
      
      // Use fetched conversation if available, otherwise use existing or create placeholder
      if (fetchedConversation) {
        conversation = fetchedConversation;
        // Update or add to conversations list
        setConversations(prev => {
          const exists = prev.find(c => c.user_id === userId);
          if (exists) {
            // Update existing conversation with fresh data
            return prev.map(c => 
              c.user_id === userId ? { ...c, ...fetchedConversation } : c
            );
          } else {
            // Add new conversation
            return [...prev, fetchedConversation];
          }
        });
      } else if (!conversation) {
        // Fallback if we couldn't fetch details
        conversation = {
          user_id: userId,
          full_name: 'User',
          unread_count: 0,
        };
        setConversations(prev => {
          const exists = prev.find(c => c.user_id === userId);
          if (!exists) {
            return [...prev, conversation];
          }
          return prev;
        });
      }
      
      // Update messages and selected conversation
      setMessages(messagesData);
      setSelectedConversation(conversation);
      
      // Mark messages as read
      try {
        await chatService.markAsRead(userId);
      } catch (readError) {
        // Ignore read errors for new conversations
        console.log('Could not mark as read (likely new conversation)');
      }
      
      // Update conversation list to clear unread count
      setConversations(prev => 
        prev.map(c => 
          c.user_id === userId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
      
      // Still set a basic conversation so user can send messages
      const basicConversation = {
        user_id: userId,
        full_name: 'User',
        unread_count: 0,
      };
      setSelectedConversation(basicConversation);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    try {
      const response = await chatService.sendMessage({
        receiver_id: selectedConversation.user_id,
        message_text: messageText,
      });
      
      if (response.success) {
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, response.data]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Restore the message if sending failed
      setNewMessage(messageText);
    } finally {
      setSending(false);
      messageInputRef.current?.focus();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 flex">
      {/* Conversations List */}
      <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No messages yet
              </h3>
              <p className="text-gray-600 text-sm">
                Start a conversation with a worker or client
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => loadConversation(conv.user_id)}
                  className={`w-full p-4 flex items-start hover:bg-gray-50 transition-colors ${
                    selectedConversation?.user_id === conv.user_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {conv.profile_photo ? (
                      <img
                        src={conv.profile_photo}
                        alt={conv.full_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-600">
                          {conv.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conv.full_name}
                      </h3>
                      {conv.last_message_time && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(conv.last_message_time)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                  
                  {conv.unread_count > 0 && (
                    <div className="ml-2 flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary-600 rounded-full">
                        {conv.unread_count}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="flex-shrink-0">
                {selectedConversation.profile_photo ? (
                  <img
                    src={selectedConversation.profile_photo}
                    alt={selectedConversation.full_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-600">
                      {selectedConversation.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedConversation.full_name}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-gray-400 text-6xl mb-4">👋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start the conversation
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Send a message to begin chatting
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isSender = message.sender_id === user?.id;
                    const showDateDivider = index === 0 || 
                      new Date(messages[index - 1].created_at).toDateString() !== 
                      new Date(message.created_at).toDateString();

                    return (
                      <div key={message.id}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                              {new Date(message.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        
                        <div className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isSender 
                              ? 'bg-primary-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm break-words">{message.message_text}</p>
                            <p className={`text-xs mt-1 ${
                              isSender ? 'text-primary-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 input-field"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <div className="text-gray-400 text-8xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;