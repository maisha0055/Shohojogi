import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getAuthToken } from '../services/api';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const tokenCheckInterval = useRef(null);

  useEffect(() => {
    const connectSocket = () => {
      const token = getAuthToken();
      
      if (!token) {
        setError('No authentication token');
        // Clean up any existing socket if token is removed
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
          setConnected(false);
        }
        return;
      }

      // Clean up existing socket before creating new one
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Initialize socket connection
      socketRef.current = io(SOCKET_URL, {
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: true,
      });

      // Connection handlers
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        setError(null);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
        // Don't set error for normal disconnects or client-initiated disconnects
        if (reason === 'io client disconnect' || reason === 'io server disconnect') {
          setError(null);
        }
      });

      socketRef.current.on('error', (err) => {
        console.error('Socket error:', err);
        // Don't set error for auth errors (expected after logout)
        if (!err.message?.includes('Authentication error')) {
          setError(err.message);
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        // Only set error if it's not an auth error (which is expected after logout)
        if (!err.message?.includes('Authentication error')) {
          setError(err.message);
        }
        setConnected(false);
      });
    };

    // Initial connection
    connectSocket();

    // Check token periodically and reconnect if needed
    tokenCheckInterval.current = setInterval(() => {
      const token = getAuthToken();
      if (!token && socketRef.current) {
        // Token was removed, disconnect
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setError(null);
      } else if (token && !socketRef.current) {
        // Token exists but socket is disconnected, reconnect
        connectSocket();
      }
    }, 2000); // Check every 2 seconds

    // Cleanup on unmount
    return () => {
      if (tokenCheckInterval.current) {
        clearInterval(tokenCheckInterval.current);
      }
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, []); // Only run once on mount

  // Emit event
  const emit = useCallback((event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected');
    }
  }, [connected]);

  // Listen to event
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  // Remove event listener
  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

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