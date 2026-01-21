// util/socket/StockDetailsSocket.js
import { io } from 'socket.io-client';

class StockDetailsSocketService {
  constructor() {
    this.socket = null;
    this.API_BASE = 'http://localhost:5000';
    this.namespace = '/stockdetails';
    this.listeners = new Map();
    this.currentSubscription = null;
    this.isConnecting = false;
  }

  /**
   * Connect to socket namespace
   */
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('✅ Already connected to StockDetails socket');
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return this.socket;
    }

    this.isConnecting = true;
    console.log(`🔌 Connecting to ${this.API_BASE}${this.namespace}`);

    this.socket = io(`${this.API_BASE}${this.namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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
      console.log(`✅ [StockDetails] Connected:`, this.socket.id);
      this.isConnecting = false;
      this.emit('connectionStatus', 'connected');

      // Resubscribe if there was a previous subscription
      if (this.currentSubscription) {
        console.log('🔄 Resubscribing after reconnection...');
        this.socket.emit('subscribe', this.currentSubscription);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ [StockDetails] Disconnected. Reason:`, reason);
      this.emit('connectionStatus', 'disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error(`⚠️ [StockDetails] Connection error:`, error.message);
      this.isConnecting = false;
      this.emit('connectionStatus', 'error');
      this.emit('error', `Connection failed: ${error.message}`);
    });

    this.socket.on('stockDetailsUpdate', (payload) => {
      console.log(`📊 [StockDetails] Update received:`, payload.type, payload.dataType);
      this.emit('stockDetailsUpdate', payload);
    });

    this.socket.on('error', (error) => {
      console.error(`❌ [StockDetails] Socket error:`, error);
      this.emit('error', error.message || 'Socket error occurred');
    });

    this.socket.on('pong', () => {
      console.log(`🏓 Pong received from StockDetails socket`);
    });
  }

  /**
   * Subscribe to chart data
   * @param {string} symbol - Stock symbol (e.g., 'HDFCBANK')
   * @param {string} duration - Duration (e.g., '1', '7', '30', '365', '1825')
   */
  subscribeChart(symbol, duration) {
    const payload = {
      type: 'chart',
      symbol,
      duration
    };
    this.subscribe(payload);
  }

  /**
   * Subscribe to live quote data
   * @param {string} symbol - Stock symbol
   * @param {string} marketType - Market type (default: 'N')
   * @param {string} series - Series (default: 'EQ')
   */
  subscribeQuote(symbol, marketType = 'N', series = 'EQ') {
    const payload = {
      type: 'quote',
      symbol,
      marketType,
      series
    };
    this.subscribe(payload);
  }

  /**
   * Subscribe to historical data
   * @param {string} symbol - Stock symbol
   * @param {string} fromDate - Start date (DD-MM-YYYY)
   * @param {string} toDate - End date (DD-MM-YYYY)
   * @param {string} series - Series (default: 'EQ')
   */
  subscribeHistorical(symbol, fromDate, toDate, series = 'EQ') {
    const payload = {
      type: 'historical',
      symbol,
      fromDate,
      toDate,
      series
    };
    this.subscribe(payload);
  }

  /**
   * Generic subscribe method
   */
  subscribe(payload) {
    if (!this.socket || !this.socket.connected) {
      console.log('⏳ Socket not connected, connecting first...');
      this.connect();
      
      // Wait for connection and then subscribe
      this.socket.once('connect', () => {
        console.log('✅ Connected, now subscribing...');
        this.subscribe(payload);
      });
      return;
    }

    console.log('📤 Subscribing to:', payload);
    this.currentSubscription = payload;
    this.socket.emit('subscribe', payload);
  }

  /**
   * Unsubscribe from current subscription
   */
  unsubscribe() {
    if (!this.socket || !this.socket.connected) return;
    
    console.log('🔌 Unsubscribing from StockDetails');
    this.socket.emit('unsubscribe');
    this.currentSubscription = null;
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.socket && this.socket.connected) {
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

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
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
    
    const listeners = this.listeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (!this.socket) return;

    console.log('🔌 Disconnecting from StockDetails socket');
    this.unsubscribe();
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.currentSubscription = null;
    this.listeners.clear();
    this.isConnecting = false;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket ? this.socket.connected : false;
  }

  /**
   * Get current socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const stockDetailsSocket = new StockDetailsSocketService();

export default stockDetailsSocket;