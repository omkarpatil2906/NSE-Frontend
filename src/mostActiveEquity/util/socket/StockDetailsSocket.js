// util/socket/StockDetailsSocket.js
import { io } from 'socket.io-client';

class StockDetailsSocketService {
  constructor() {
    this.socket = null;
    this.API_BASE = 'http://localhost:5000'; 
    this.namespace = '/stockdetails';
    this.listeners = new Map();
    this.currentSubscription = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isConnecting = false;
  }

  /**
   * Connect to stock details namespace
   */
  connect() {
    if (this.socket?.connected) {
      console.log('✅ [StockDetails] Already connected');
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('⏳ [StockDetails] Connection already in progress');
      return this.socket;
    }

    console.log(`🔌 [StockDetails] Connecting to ${this.API_BASE}${this.namespace}`);
    this.isConnecting = true;

    this.socket = io(`${this.API_BASE}${this.namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000
    });

    this.setupSocketListeners();
    return this.socket;
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log(`✅ [StockDetails] Connected: ${this.socket.id}`);
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.emit('connected', { socketId: this.socket.id });

      // Resubscribe if there was a previous subscription
      if (this.currentSubscription) {
        console.log('🔄 [StockDetails] Resubscribing after reconnection');
        const { symbol, duration, dataType } = this.currentSubscription;
        this.doSubscribe(symbol, duration, dataType);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ [StockDetails] Disconnected. Reason: ${reason}`);
      this.isConnecting = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.isConnecting = false;
      console.error(`⚠️ [StockDetails] Connection error (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);
      this.emit('error', { 
        error: error.message, 
        type: 'connection',
        attempts: this.reconnectAttempts 
      });
    });

    this.socket.on('stockDetailsUpdate', (data) => {
      console.log(`📊 [StockDetails] Update received:`, {
        type: data.type,
        symbol: data.symbol,
        duration: data.duration,
        dataType: data.dataType,
        timestamp: data.timestamp
      });
      
      this.emit('stockUpdate', data);
    });

    this.socket.on('error', (error) => {
      console.error(`❌ [StockDetails] Socket error:`, error);
      this.emit('error', { 
        error: error.message || 'Socket error occurred', 
        type: 'api' 
      });
    });

    this.socket.on('pong', () => {
      console.log(`🏓 [StockDetails] Pong received`);
      this.emit('pong');
    });
  }

  /**
   * Subscribe to stock updates
   * @param {string} symbol - Stock symbol
   * @param {string} duration - Time duration (1D, 1W, 1M, 1Y, 5Y)
   * @param {string} dataType - Type of data ('chart', 'historical', 'live')
   */
  subscribe(symbol, duration, dataType = 'chart') {
    if (!this.socket?.connected) {
      console.error('❌ [StockDetails] Cannot subscribe: Socket not connected');
      
      // Connect first, then subscribe
      this.connect();
      this.socket.once('connect', () => {
        this.doSubscribe(symbol, duration, dataType);
      });
      return false;
    }

    return this.doSubscribe(symbol, duration, dataType);
  }

  /**
   * Perform the actual subscription
   */
  doSubscribe(symbol, duration, dataType = 'chart') {
    console.log(`📡 [StockDetails] Subscribing to ${symbol} (duration: ${duration}, type: ${dataType})`);
    
    // Store current subscription for reconnection
    this.currentSubscription = { symbol, duration, dataType };
    
    this.socket.emit('subscribe', { 
      symbol, 
      duration, 
      dataType,
      series: 'EQ' 
    });
    return true;
  }

  /**
   * Unsubscribe from current stock
   */
  unsubscribe() {
    if (!this.socket?.connected) {
      console.warn('⚠️ [StockDetails] Cannot unsubscribe: Socket not connected');
      return false;
    }

    console.log('🔕 [StockDetails] Unsubscribing from current stock');
    this.socket.emit('unsubscribe');
    this.currentSubscription = null;
    return true;
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
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    callbacks.delete(callback);
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;
    
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [StockDetails] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 [StockDetails] Disconnecting...');
      this.unsubscribe();
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentSubscription = null;
      this.listeners.clear();
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      console.log('✅ [StockDetails] Disconnected and cleaned up');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Get current subscription info
   */
  getCurrentSubscription() {
    return this.currentSubscription;
  }
}

// Create singleton instance
const stockDetailsSocket = new StockDetailsSocketService();

export default stockDetailsSocket;