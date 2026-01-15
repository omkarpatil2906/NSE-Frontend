// services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.API_BASE = 'http://localhost:5000';
    this.listeners = new Map();
  }

  /**
   * Initialize socket connection
   */
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(this.API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  /**
   * Setup default event listeners
   */
  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.emit('connectionStatus', 'connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.emit('connectionStatus', 'disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', error);
      this.emit('connectionStatus', 'error');
      this.emit('error', 'WebSocket connection failed. Retrying...');
    });

    this.socket.on('marketData', (data) => {
      console.log('📊 Market data received:', data.type);
      this.emit('marketData', data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('error', error.message);
    });

    this.socket.on('pong', () => {
      console.log('🏓 Pong received');
    });
  }

  /**
   * Subscribe to market data
   */
  subscribe(params) {
    const { tab, sort = 'value', priceFilter = 'above20' } = params;
    
    if (!this.socket?.connected) {
      console.error('Socket not connected. Connecting first...');
      this.connect();
      
      // Wait for connection then subscribe
      setTimeout(() => {
        this.socket?.emit('subscribe', { tab, sort, priceFilter });
      }, 1000);
      return;
    }

    console.log('📡 Subscribing to:', { tab, sort, priceFilter });
    this.socket.emit('subscribe', { tab, sort, priceFilter });
  }

  /**
   * Unsubscribe from current market data
   */
  unsubscribe() {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }

    console.log('🔌 Unsubscribing from market data');
    this.socket.emit('unsubscribe');
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;