// services/SocketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.sockets = new Map(); // Store multiple namespace connections
    this.API_BASE = 'http://localhost:5000';
    this.listeners = new Map();
    this.currentNamespace = null;
  }

  /**
   * Get namespace path from tab ID
   */
  getNamespace(tab) {
    const namespaceMap = {
      'main-board': '/mainboard',
      'sme': '/sme',
      'etf': '/etf',
      'price-spurts': '/price-spurts',
      'volume-spurts': '/volume-spurts'
    };
    return namespaceMap[tab] || '/mainboard';
  }

  /**
   * Connect to a specific namespace
   */
  connect(tab) {
    const namespace = this.getNamespace(tab);
    
    // If already connected to this namespace, return existing socket
    if (this.sockets.has(namespace)) {
      const existingSocket = this.sockets.get(namespace);
      if (existingSocket.connected) {
        console.log(`✅ Already connected to ${namespace}`);
        this.currentNamespace = namespace;
        return existingSocket;
      } else {
        // Socket exists but disconnected, remove it
        console.log(`🗑️ Removing disconnected socket for ${namespace}`);
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
        this.sockets.delete(namespace);
      }
    }

    // Disconnect from other namespaces first
    this.disconnectAll();

    console.log(`🔌 Connecting to namespace: ${namespace}`);

    const socket = io(`${this.API_BASE}${namespace}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    this.setupSocketListeners(socket, namespace);
    this.sockets.set(namespace, socket);
    this.currentNamespace = namespace;

    return socket;
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners(socket, namespace) {
    socket.on('connect', () => {
      console.log(`✅ Connected to ${namespace}:`, socket.id);
      this.emit('connectionStatus', 'connected');
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from ${namespace}. Reason:`, reason);
      this.emit('connectionStatus', 'disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error(`⚠️ Connection error on ${namespace}:`, error.message);
      this.emit('connectionStatus', 'error');
      this.emit('error', `WebSocket connection failed: ${error.message}`);
    });

    socket.on('marketData', (data) => {
      console.log(`📊 Market data received from ${namespace}:`, data.type, `(${data.data?.length || 0} items)`);
      this.emit('marketData', data);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error on ${namespace}:`, error);
      this.emit('error', error.message || 'Socket error occurred');
    });

    socket.on('pong', () => {
      console.log(`🏓 Pong received from ${namespace}`);
    });
  }

  /**
   * Subscribe to market data
   */
  subscribe(params) {
    const { tab, sort = 'value', priceFilter = 'above20' } = params;
    
    console.log(`📡 Subscribe called for tab: ${tab}`, { sort, priceFilter });
    
    // Connect to the correct namespace
    const socket = this.connect(tab);
    
    // Always use the connect event to ensure subscription happens after connection
    const doSubscribe = () => {
      console.log(`✅ Socket connected, now subscribing to ${tab}`);
      this.doSubscribe(tab, sort, priceFilter, socket);
    };

    if (socket.connected) {
      // Already connected, subscribe immediately
      console.log(`Socket already connected to ${this.currentNamespace}`);
      doSubscribe();
    } else {
      // Wait for connection
      console.log(`⏳ Waiting for socket to connect to ${this.currentNamespace}...`);
      socket.once('connect', doSubscribe);
    }
  }

  /**
   * Perform the actual subscription
   */
  doSubscribe(tab, sort, priceFilter, socket) {
    console.log(`📤 Emitting subscribe event to ${tab}:`, { sort, priceFilter });

    // Send subscription based on tab type
    if (tab === 'main-board' || tab === 'sme' || tab === 'etf') {
      console.log(`   Sending: subscribe({ sort: '${sort}' })`);
      socket.emit('subscribe', { sort });
    } else if (tab === 'price-spurts') {
      console.log(`   Sending: subscribe({ priceFilter: '${priceFilter}' })`);
      socket.emit('subscribe', { priceFilter });
    } else if (tab === 'volume-spurts') {
      console.log(`   Sending: subscribe()`);
      socket.emit('subscribe');
    }
  }

  /**
   * Unsubscribe from current namespace
   */
  unsubscribe() {
    if (this.currentNamespace) {
      const socket = this.sockets.get(this.currentNamespace);
      if (socket && socket.connected) {
        console.log(`🔌 Unsubscribing from ${this.currentNamespace}`);
        socket.emit('unsubscribe');
      }
    }
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.currentNamespace) {
      const socket = this.sockets.get(this.currentNamespace);
      if (socket && socket.connected) {
        socket.emit('ping');
      }
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
   * Disconnect from all namespaces
   */
  disconnectAll() {
    this.sockets.forEach((socket, namespace) => {
      if (socket) {
        console.log(`🔌 Disconnecting from ${namespace}`);
        socket.removeAllListeners();
        socket.disconnect();
      }
    });
    this.sockets.clear();
    this.currentNamespace = null;
  }

  /**
   * Disconnect from current namespace only
   */
  disconnect() {
    if (this.currentNamespace) {
      const socket = this.sockets.get(this.currentNamespace);
      if (socket) {
        console.log(`🔌 Disconnecting from ${this.currentNamespace}`);
        socket.removeAllListeners();
        socket.disconnect();
        this.sockets.delete(this.currentNamespace);
      }
    }
    this.listeners.clear();
    this.currentNamespace = null;
  }

  /**
   * Check if connected to current namespace
   */
  isConnected() {
    if (!this.currentNamespace) return false;
    const socket = this.sockets.get(this.currentNamespace);
    return socket ? socket.connected : false;
  }

  /**
   * Get current socket instance
   */
  getSocket() {
    return this.currentNamespace ? this.sockets.get(this.currentNamespace) : null;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;