import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAuthToken } from '../services/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5051';

const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    const token = getAuthToken();
    
    // If no token, set error and return
    if (!token) {
      setError('No authentication token');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // If socket already exists with same token, don't recreate
    if (socketRef.current && tokenRef.current === token && socketRef.current.connected) {
      return;
    }

    // Clean up existing socket if token changed
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Store current token
    tokenRef.current = token;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection handlers
    const handleConnect = () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setConnected(false);
    };

    const handleError = (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'Socket error occurred');
    };

    const handleConnectError = (err) => {
      console.error('Socket connection error:', err);
      setError(err.message || 'Failed to connect to server');
      setConnected(false);
    };

    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);
    socketRef.current.on('error', handleError);
    socketRef.current.on('connect_error', handleConnectError);

    // Cleanup on unmount or token change
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  // Emit event
  const emit = (event, data) => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit(event, data);
      } else {
        console.warn('Socket not connected. Event not sent:', event);
      }
    } else {
      console.warn('Socket not initialized');
    }
  };

  // Listen to event
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  // Remove event listener
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    connected,
    error,
    emit,
    on,
    off,
  };
};

export default useSocket;