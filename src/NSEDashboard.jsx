import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, ChevronDown, Wifi, WifiOff, BarChart3 } from 'lucide-react';

let io;
if (typeof window !== 'undefined') {
  if (window.io) {
    io = window.io;
  } else {
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

  useEffect(() => {
    addDebugLog('🔌 Starting WebSocket initialization...');
    
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

  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      addDebugLog(`🔄 Tab/Filter changed: ${activeTab}, sort: ${sort}, filter: ${priceFilter}`);
      setLoading(true);
      setData([]);
      
      addDebugLog('   📤 Unsubscribing from previous...');
      socketRef.current.emit('unsubscribe');
      
      setTimeout(() => {
        addDebugLog(`   📤 Subscribing to new: ${activeTab}`);
        socketRef.current.emit('subscribe', {
          tab: activeTab,
          sort,
          priceFilter
        });
      }, 100);
    }
  }, [activeTab, sort, priceFilter]);

  const formatNumber = (num) => {
    if (!num) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol) => {
    if (!vol) return '0';
    return vol.toLocaleString('en-IN');
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Wifi, text: 'Live', pulse: true },
      disconnected: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: WifiOff, text: 'Offline', pulse: false },
      error: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: WifiOff, text: 'Error', pulse: false }
    };

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border backdrop-blur-sm ${config.color} transition-all duration-300`}>
        <div className="relative">
          <Icon className="w-4 h-4" />
          {config.pulse && (
            <span className="absolute inset-0 animate-ping">
              <Icon className="w-4 h-4 opacity-75" />
            </span>
          )}
        </div>
        <span className="text-sm font-semibold">{config.text}</span>
        {connectionStatus === 'connected' && updateCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-emerald-500/30 rounded-full">{updateCount}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="h-screen flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Most Active Equities
              </h1>
              {lastUpdate && (
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
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
              className="group flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-semibold">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs and Controls */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl mb-6 overflow-hidden">
          <div className="flex border-b border-slate-700/50 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 cursor-pointer font-semibold whitespace-nowrap transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <>
                    <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-violet-500/10 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-blue-500 to-violet-500 shadow-lg shadow-blue-500/50"></div>
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-800/30 backdrop-blur-sm">
            <div className="flex items-center gap-6">
              {currentTab?.hasSort && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-300">Sort By:</span>
                  <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    {['volume', 'value'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setSort(option)}
                        className={`relative px-5 py-2 cursor-pointer rounded-md text-sm font-semibold transition-all duration-300 ${
                          sort === option
                            ? 'text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sort === option && (
                          <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                        )}
                        <span className="relative z-10 capitalize">{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentTab?.hasPriceFilter && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-300">Securities:</span>
                  <div className="relative">
                    <select
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value)}
                      className="appearance-none px-5 py-2 pr-10 rounded-lg text-sm font-semibold bg-slate-800/50 border border-slate-700/50 text-slate-200 hover:border-slate-600 cursor-pointer transition-all duration-300 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="above20">&gt; Rs. 20</option>
                      <option value="below20">&lt; Rs. 20</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {data.length > 0 && (
                <div className="ml-auto text-sm text-slate-400 bg-slate-800/30 px-4 py-2 rounded-lg border border-slate-700/30">
                  Showing <span className="font-bold text-blue-400">{Math.min(data.length, 20)}</span> of <span className="font-semibold text-slate-300">{data.length}</span> records
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm animate-pulse">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-slate-800 to-slate-900 sticky top-0 z-10 shadow-lg">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">#</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Symbol</th>
                  
                  {activeTab === 'volume-spurts' ? (
                    <>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">1 WK AVG.<br/>VOLUME</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">No. of<br/>Times</th>
                    </>
                  ) : activeTab === 'price-spurts' ? (
                    <>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Series</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">LTP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">%CHNG</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br/>(₹ Lakhs)</th>
                    </>
                  ) : activeTab === 'etf' ? (
                    <>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Open</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">High</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Low</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Prev. Close</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">LTP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">NAV</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">%CHNG</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br/>(₹ Lakhs)</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Open</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">High</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Low</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Prev. Close</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">LTP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">%CHNG</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br/>(Shares)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br/>(₹ Lakhs)</th>
                      {activeTab === 'main-board' && <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">CA</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-16 text-center">
                      <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-400" />
                      <p className="text-slate-300 font-semibold">Connecting to live data...</p>
                      <p className="text-xs text-slate-500 mt-2">Establishing real-time connection</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-16 text-center">
                      <p className="text-slate-300 font-semibold">No data available</p>
                      <p className="text-xs text-slate-500 mt-2">Backend: {connectionStatus}</p>
                    </td>
                  </tr>
                ) : (
                  data.slice(0, 20).map((item, index) => {
                    if (activeTab === 'volume-spurts') {
                      return (
                        <tr key={item.symbol || index} className="hover:bg-slate-800/40 transition-all duration-200 group">
                          <td className="px-6 py-4 text-sm text-slate-500 group-hover:text-slate-400">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatVolume(item.volume)}</td>
                          <td className="px-6 py-4 text-sm text-right text-slate-400">{formatVolume(item.weekAvgVolume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{item.noOfTimes}</td>
                        </tr>
                      );
                    }

                    if (activeTab === 'price-spurts') {
                      const isPositive = item.pChange >= 0;

                      return (
                        <tr key={item.symbol || index} className="hover:bg-slate-800/40 transition-all duration-200 group">
                          <td className="px-6 py-4 text-sm text-slate-500 group-hover:text-slate-400">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-center text-slate-400">{item.series || 'EQ'}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.ltp)}</td>
                          <td className={`px-6 py-4 text-sm text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{formatNumber(item.pChange)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-slate-400">{formatVolume(item.volume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.value)}</td>
                        </tr>
                      );
                    }

                    if (activeTab === 'etf') {
                      const isPositive = item.pChange >= 0;

                      return (
                        <tr key={item.symbol || index} className="hover:bg-slate-800/40 transition-all duration-200 group">
                          <td className="px-6 py-4 text-sm text-slate-500 group-hover:text-slate-400">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300">{item.symbol}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.open)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.high)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.low)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.prevClose)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.ltp)}</td>
                          <td className="px-6 py-4 text-sm text-right text-slate-400">{formatNumber(item.nav)}</td>
                          <td className={`px-6 py-4 text-sm text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{formatNumber(item.pChange)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-slate-400">{formatVolume(item.volume)}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.value)}</td>
                        </tr>
                      );
                    }

                    const isPositive = item.pChange >= 0;

                    return (
                      <tr key={item.symbol || index} className="hover:bg-slate-800/40 transition-all duration-200 group">
                        <td className="px-6 py-4 text-sm text-slate-500 group-hover:text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300">{item.symbol}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.open)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.high)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.low)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.prevClose)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.ltp)}</td>
                        <td className={`px-6 py-4 text-sm text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{formatNumber(item.pChange)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-400">{formatVolume(item.volume)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-200">{formatNumber(item.value)}</td>
                        {activeTab === 'main-board' && (
                          <td className="px-6 py-4 text-sm text-slate-400">{item.ca}</td>
                        )}
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