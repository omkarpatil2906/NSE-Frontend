import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, ChevronDown, Wifi, WifiOff } from 'lucide-react';

// Socket.io client - import from CDN if npm package not available
let io;
if (typeof window !== 'undefined') {
  if (window.io) {
    io = window.io;
  } else {
    // Fallback: load from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.async = true;
    document.head.appendChild(script);
  }
}

const NSEDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [updateCount, setUpdateCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  
  // Filters
  const [activeTab, setActiveTab] = useState('main-board');
  const [sort, setSort] = useState('value');
  const [priceFilter, setPriceFilter] = useState('above20');

  const socketRef = useRef(null);
  const API_BASE = 'http://localhost:5000';

  const tabs = [
    { id: 'main-board', label: 'Main Board', hasSort: true },
    { id: 'sme', label: 'SME', hasSort: true },
    { id: 'etf', label: 'ETFs', hasSort: true },
    { id: 'price-spurts', label: 'Price Spurts', hasSort: false, hasPriceFilter: true },
    { id: 'volume-spurts', label: 'Volume Spurts', hasSort: false }
  ];

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setDebugLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    addDebugLog('🔌 Starting WebSocket initialization...');
    
    // Wait for socket.io to be available
    const initSocket = () => {
      if (!window.io) {
        addDebugLog('⏳ Waiting for socket.io library...');
        setTimeout(initSocket, 100);
        return;
      }

      addDebugLog('✅ Socket.io library loaded');
      
      const socket = window.io(API_BASE, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        addDebugLog('✅ WebSocket connected');
        setConnectionStatus('connected');
        setError(null);
        
        // Subscribe to current tab/filter
        addDebugLog(`📡 Subscribing to: ${activeTab}`);
        socket.emit('subscribe', {
          tab: activeTab,
          sort,
          priceFilter
        });
      });

      socket.on('disconnect', () => {
        addDebugLog('❌ WebSocket disconnected');
        setConnectionStatus('disconnected');
      });

      socket.on('connect_error', (err) => {
        addDebugLog(`❌ Connection error: ${err.message}`);
        setConnectionStatus('error');
        setError('WebSocket connection failed. Retrying...');
      });

      socket.on('marketData', (update) => {
        addDebugLog(`📊 Received ${update.type} data: ${update.data?.length || update.fullData?.length || 0} records`);
        
        if (update.type === 'initial') {
          addDebugLog(`✅ Setting initial data: ${update.data.length} records`);
          setData(update.data);
          setLoading(false);
        } else if (update.type === 'update') {
          addDebugLog(`🔄 Updating data: ${update.fullData.length} records`);
          setData(update.fullData);
          setUpdateCount(prev => prev + 1);
          
          addDebugLog(`📈 Changes: +${update.changes.updated.length} ~${update.changes.added.length} -${update.changes.removed.length}`);
        }
        
        setLastUpdate(new Date(update.timestamp));
        setError(null);
      });

      socket.on('error', (err) => {
        addDebugLog(`❌ Server error: ${err.message}`);
        setError(err.message);
        setLoading(false);
      });

      // Ping-pong for connection health
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
        }
      }, 15000);

      return () => {
        clearInterval(pingInterval);
        socket.disconnect();
      };
    };

    const cleanup = initSocket();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Handle tab/filter changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      addDebugLog(`🔄 Resubscribing: ${activeTab}, sort: ${sort}, filter: ${priceFilter}`);
      setLoading(true);
      
      // Unsubscribe from previous
      socketRef.current.emit('unsubscribe');
      
      // Subscribe to new
      socketRef.current.emit('subscribe', {
        tab: activeTab,
        sort,
        priceFilter
      });
    }
  }, [activeTab, sort, priceFilter]);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    return num.toLocaleString('en-IN');
  };

  const formatVolume = (vol) => {
    if (!vol) return '0';
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)}Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)}L`;
    return vol.toLocaleString('en-IN');
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: { color: 'text-green-600', icon: Wifi, text: 'Live' },
      disconnected: { color: 'text-gray-400', icon: WifiOff, text: 'Offline' },
      error: { color: 'text-red-600', icon: WifiOff, text: 'Error' }
    };

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.text}</span>
        {connectionStatus === 'connected' && updateCount > 0 && (
          <span className="text-xs text-gray-500">({updateCount})</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">NSE Live Market Data</h1>
                {lastUpdate && (
                  <p className="text-sm text-gray-600 mt-1">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionIndicator />
              <button
                onClick={() => {
                  if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('unsubscribe');
                    socketRef.current.emit('subscribe', { tab: activeTab, sort, priceFilter });
                  }
                }}
                disabled={loading || connectionStatus !== 'connected'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Debug Console */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              🐛 Debug Console ({debugLogs.length} logs)
            </summary>
            <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded font-mono text-xs max-h-40 overflow-y-auto">
              {debugLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </details>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-6">
              {currentTab?.hasSort && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Sort By:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSort('volume')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sort === 'volume'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Volume
                    </button>
                    <button
                      onClick={() => setSort('value')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sort === 'value'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Value
                    </button>
                  </div>
                </div>
              )}

              {currentTab?.hasPriceFilter && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Securities:</span>
                  <div className="relative">
                    <select
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value)}
                      className="appearance-none px-4 py-2 pr-10 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <option value="above20">&gt; Rs. 20</option>
                      <option value="below20">&lt; Rs. 20</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {data.length > 0 && (
                <div className="ml-auto text-sm text-gray-600">
                  Showing <span className="font-semibold text-blue-600">{Math.min(data.length, 20)}</span> of <span className="font-semibold">{data.length}</span> records
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Symbol</th>
                  
                  {activeTab === 'volume-spurts' ? (
                    <>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">1 Wk Avg<br/>Volume</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">No. of<br/>Times</th>
                    </>
                  ) : activeTab === 'price-spurts' ? (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Series</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">LTP</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">% Change</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Value<br/>(₹ Lakhs)</th>
                    </>
                  ) : activeTab === 'etf' ? (
                    <>
                      <th className="px-6 py-4 text-right text-sm font-semibold">LTP</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">NAV</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">% Change</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Value<br/>(₹ Lakhs)</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Company</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">LTP</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Change</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">% Change</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Volume</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Turnover</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Connecting to live data...</p>
                      <p className="text-xs mt-2">Check debug console above for details</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <p>No data available</p>
                      <p className="text-xs mt-2">Backend: {connectionStatus}</p>
                    </td>
                  </tr>
                ) : (
                  data.slice(0, 20).map((item, index) => {
                    if (activeTab === 'volume-spurts') {
                      return (
                        <tr key={item.symbol || index} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-600">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium">{formatVolume(item.volume)}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">{formatVolume(item.oneWeekAvgVolume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-800">{item.noOfTimes}</td>
                        </tr>
                      );
                    }

                    if (activeTab === 'price-spurts') {
                      const percentChange = parseFloat(item.pChange || 0);
                      const isPositive = percentChange >= 0;

                      return (
                        <tr key={item.symbol || index} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-600">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-center text-gray-700">{item.series || 'EQ'}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium">₹{parseFloat(item.ltp || 0).toFixed(2)}</td>
                          <td className={`px-6 py-4 text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">{formatVolume(item.totalTradedVolume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-800">{formatNumber(item.turnover)}</td>
                        </tr>
                      );
                    }

                    if (activeTab === 'etf') {
                      const percentChange = parseFloat(item.pChange || 0);
                      const isPositive = percentChange >= 0;

                      return (
                        <tr key={item.symbol || index} className="border-b hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-600">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium">₹{parseFloat(item.ltp || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">₹{parseFloat(item.nav || 0).toFixed(2)}</td>
                          <td className={`px-6 py-4 text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">{formatVolume(item.totalTradedVolume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-800">{formatNumber(item.turnover)}</td>
                        </tr>
                      );
                    }

                    const priceChange = parseFloat(item.change || 0);
                    const percentChange = parseFloat(item.pChange || 0);
                    const isPositive = priceChange >= 0;

                    return (
                      <tr key={item.symbol || index} className="border-b hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-600">{item.symbol}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{item.companyName || item.symbol}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium">₹{parseFloat(item.ltp || 0).toFixed(2)}</td>
                        <td className={`px-6 py-4 text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {isPositive ? '+' : ''}{priceChange.toFixed(2)}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700">{formatVolume(item.totalTradedVolume)}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-800">{formatNumber(item.turnover)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NSEDashboard;