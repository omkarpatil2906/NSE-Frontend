import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, ChevronDown, Wifi, WifiOff, BarChart3, Grid3x3, Table2, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import socketService from '../services/SocketService';
import NseStockDetails from './NseStockDetails';
import { StockChartData } from '../services/NseStockDetailsServices';


const MostActiveEquity = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [viewMode, setViewMode] = useState('table');

  const [activeTab, setActiveTab] = useState('main-board');
  const [sort, setSort] = useState('value');
  const [priceFilter, setPriceFilter] = useState('above20');


  console.log("Data", data);
  


  const tabs = [
    { id: 'main-board', label: 'Main Board', hasSort: true },
    { id: 'sme', label: 'SME', hasSort: true },
    { id: 'etf', label: 'ETFs', hasSort: true },
    { id: 'price-spurts', label: 'Price Spurts', hasSort: false, hasPriceFilter: true },
    { id: 'volume-spurts', label: 'Volume Spurts', hasSort: false }
  ];


  useEffect(() => {
    console.log('🚀 Component mounted - Setting up socket listeners...');

    // Connection status listener
    const handleConnectionStatus = (status) => {
      console.log('📡 Connection status changed:', status);
      setConnectionStatus(status);
      if (status === 'connected') {
        setError(null);
      }
    };

    // Market data listener
    const handleMarketData = (update) => {
      console.log('📊 Market data received:', update.type, 'Records:', update.data?.length || update.fullData?.length);

      if (update.type === 'initial') {
        setData(update.data || []);
        setLoading(false);
      } else if (update.type === 'update') {
        setData(update.fullData || []);
      }

      setLastUpdate(new Date(update.timestamp));
      setError(null);
    };

    // Error listener
    const handleError = (errorMsg) => {
      console.error('❌ Socket error:', errorMsg);
      setError(errorMsg);
      setData([]);
      setLoading(false);
    };

    // Register listeners
    socketService.on('connectionStatus', handleConnectionStatus);
    socketService.on('marketData', handleMarketData);
    socketService.on('error', handleError);

    // Setup ping interval
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.ping();
      }
    }, 15000);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting - Cleaning up...');
      clearInterval(pingInterval);
      socketService.off('connectionStatus', handleConnectionStatus);
      socketService.off('marketData', handleMarketData);
      socketService.off('error', handleError);
      socketService.disconnectAll();
    };
  }, []); // Empty dependency - runs once on mount

  // Handle tab/sort/filter changes - subscribe to new data stream
  useEffect(() => {
    console.log('🔄 Subscription params changed:', { activeTab, sort, priceFilter });

    setLoading(true);
    setData([]);

    // Unsubscribe from previous subscription
    socketService.unsubscribe();

    // Connect to new namespace and subscribe
    const connectAndSubscribe = () => {
      const socket = socketService.connect(activeTab);

      if (socket && socket.connected) {
        console.log('✅ Socket connected, subscribing...');
        socketService.subscribe({ tab: activeTab, sort, priceFilter });
      } else {
        console.log('⏳ Socket not ready, waiting for connection...');
        // Wait for connection then subscribe
        setTimeout(() => {
          if (socketService.isConnected()) {
            console.log('✅ Socket connected after wait, subscribing...');
            socketService.subscribe({ tab: activeTab, sort, priceFilter });
          } else {
            console.error('❌ Socket connection timeout');
            setError('Failed to connect to live data stream');
            setLoading(false);
          }
        }, 1500);
      }
    };

    // Small delay to ensure clean disconnect
    setTimeout(connectAndSubscribe, 100);

  }, [activeTab, sort, priceFilter]);

  const formatNumber = (num) => {
    if (!num) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol) => {
    if (!vol) return '0';
    return vol.toLocaleString('en-IN');
  };


 const openStockDetailsPage = async (item) => {
  try {
    const stockInfo = {
      identifier: item.identifier || item.symbol,
      name: item.symbol,
      symbol: item.symbol,
      ltp: item.ltp,
      open: item.open,
      high: item.high,
      low: item.low,
      prevClose: item.prevClose,
      pChange: item.pChange,
      volume: item.volume,
      value: item.value,
      series: item.series || 'EQ',
      closePrice: item.ltp,
      grapthData: []
    };

    // Store in localStorage
    localStorage.setItem('selectedStock', JSON.stringify(stockInfo));

    // Open the new tab immediately
    const newTab = window.open('/stock-details', '_blank', 'noopener,noreferrer');

    // Fetch chart data in background
    StockChartData(item.identifier || item.symbol, "1D")
      .then(response => {
        console.log('API Response:', response);
        
        if (response.data && response.data.success) {
          // Update with chart data
          const updatedStockInfo = {
            ...stockInfo,
            identifier: response.data.data.identifier,
            name: response.data.data.name,
            closePrice: response.data.data.closePrice,
            grapthData: response.data.data.graphData // Note: API uses 'graphData' not 'grapthData'
          };
          
          // Update localStorage with chart data
          localStorage.setItem('selectedStock', JSON.stringify(updatedStockInfo));
          
          console.log('Stock data updated with chart:', updatedStockInfo);
        }
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        // Data is already stored, chart will show "No data available"
      });

  } catch (err) {
    console.error('Error opening stock details:', err);
  }
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
        {/* {connectionStatus === 'connected' && updateCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-emerald-500/30 rounded-full">{updateCount}</span>
        )} */}
      </div>
    );
  };

  const GridCard = ({ item, index }) => {
    const isPositive = item.pChange >= 0;

    if (activeTab === 'volume-spurts') {
      return (
        <div className="group relative bg-linear-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-blue-500/0 via-violet-500/0 to-blue-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-500/10 to-violet-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                  <div className="h-1 w-1 rounded-full bg-slate-600"></div>
                  <Activity className="w-3 h-3 text-blue-400" />
                </div>
                <h3
                  className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors"
                  onClick={() => openStockDetailsPage(item)}>
                  {item.symbol}
                </h3>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                <TrendingUp className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-bold text-blue-400">{item.noOfTimes}x</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <span className="text-xs text-slate-400 font-semibold">Volume</span>
                <span className="text-sm font-bold text-emerald-400">{formatVolume(item.volume)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <span className="text-xs text-slate-400 font-semibold">1 WK AVG</span>
                <span className="text-sm font-semibold text-slate-300">{formatVolume(item.weekAvgVolume)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Sparkles className="w-3 h-3" />
                <span>Volume Spurt Detected</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'price-spurts') {
      return (
        <div className="group relative bg-linear-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-blue-500/0 via-violet-500/0 to-blue-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
          <div className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${isPositive ? 'from-emerald-500/10 to-green-500/10' : 'from-red-500/10 to-rose-500/10'} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                  <div className="h-1 w-1 rounded-full bg-slate-600"></div>
                  <span className="text-xs text-slate-500 font-semibold">{item.series || 'EQ'}</span>
                </div>
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors"
                  onClick={() => openStockDetailsPage(item)}>
                  {item.symbol}
                </h3>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatNumber(item.pChange)}%
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-3xl font-bold text-white mb-1">₹{formatNumber(item.ltp)}</div>
              <div className="text-xs text-slate-500">Last Traded Price</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <div className="text-xs text-slate-400 mb-1">Volume</div>
                <div className="text-sm font-bold text-slate-200">{formatVolume(item.volume)}</div>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <div className="text-xs text-slate-400 mb-1">Value (₹L)</div>
                <div className="text-sm font-bold text-slate-200">{formatNumber(item.value)}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'etf') {
      return (
        <div className="group relative bg-linear-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-blue-500/0 via-violet-500/0 to-blue-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>

          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-500 mb-1">#{index + 1}</div>
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors"
                  onClick={() => openStockDetailsPage(item)}>
                  {item.symbol}
                </h3>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatNumber(item.pChange)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">LTP</div>
                <div className="text-2xl font-bold text-white">₹{formatNumber(item.ltp)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">NAV</div>
                <div className="text-2xl font-bold text-violet-400">₹{formatNumber(item.nav)}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                <div className="text-xs text-slate-500">Open</div>
                <div className="text-sm font-semibold text-slate-200">{formatNumber(item.open)}</div>
              </div>
              <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                <div className="text-xs text-slate-500">High</div>
                <div className="text-sm font-semibold text-emerald-400">{formatNumber(item.high)}</div>
              </div>
              <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                <div className="text-xs text-slate-500">Low</div>
                <div className="text-sm font-semibold text-red-400">{formatNumber(item.low)}</div>
              </div>
              <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                <div className="text-xs text-slate-500">Prev</div>
                <div className="text-sm font-semibold text-slate-200">{formatNumber(item.prevClose)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div className="text-xs text-slate-400">Volume</div>
                <div className="text-sm font-bold text-slate-200">{formatVolume(item.volume)}</div>
              </div>
              <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div className="text-xs text-slate-400">Value (₹L)</div>
                <div className="text-sm font-bold text-slate-200">{formatNumber(item.value)}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group relative bg-linear-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-500/0 via-violet-500/0 to-blue-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-linear-to-br ${isPositive ? 'from-emerald-500/10 to-green-500/10' : 'from-red-500/10 to-rose-500/10'} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                {activeTab === 'main-board' && item.ca && (
                  <>
                    <div className="h-1 w-1 rounded-full bg-slate-600"></div>
                    <span className="text-xs text-amber-400 font-semibold">{item.ca}</span>
                  </>
                )}
              </div>
              <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors"
                onClick={() => openStockDetailsPage(item)} >
                {item.symbol}
              </h3>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{formatNumber(item.pChange)}%
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-white mb-1">₹{formatNumber(item.ltp)}</div>
            <div className="text-xs text-slate-500">Last Traded Price</div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500">Open</div>
              <div className="text-sm font-semibold text-slate-200">{formatNumber(item.open)}</div>
            </div>
            <div className="text-center p-2 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500">High</div>
              <div className="text-sm font-semibold text-emerald-400">{formatNumber(item.high)}</div>
            </div>
            <div className="text-center p-2 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500">Low</div>
              <div className="text-sm font-semibold text-red-400">{formatNumber(item.low)}</div>
            </div>
            <div className="text-center p-2 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500">Prev</div>
              <div className="text-sm font-semibold text-slate-200">{formatNumber(item.prevClose)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
              <div className="text-xs text-slate-400">Volume</div>
              <div className="text-sm font-bold text-slate-200">{formatVolume(item.volume)}</div>
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
              <div className="text-xs text-slate-400">Value (₹L)</div>
              <div className="text-sm font-bold text-slate-200">{formatNumber(item.value)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(59, 130, 246), rgb(139, 92, 246));
          border-radius: 10px;
          border: 2px solid rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(96, 165, 250), rgb(167, 139, 250));
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(to right, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%);
          background-size: 1000px 100%;
        }
      `}</style>

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

            {/* View Toggle */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <button
                onClick={() => setViewMode('table')}
                className={`relative px-4 py-2 rounded-md cursor-pointer transition-all duration-300 ${viewMode === 'table' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {viewMode === 'table' && (
                  <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  <span className="font-semibold">Table</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`relative px-4 py-2 cursor-pointer rounded-md transition-all duration-300 ${viewMode === 'grid' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {viewMode === 'grid' && (
                  <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  <span className="font-semibold">Grid</span>
                </div>
              </button>
            </div>

            {/* <button
              onClick={() => {
                if (socketRef.current && socketRef.current.connected) {
                  socketRef.current.emit('unsubscribe');
                  socketRef.current.emit('subscribe', { tab: activeTab, sort, priceFilter });
                }
              }}
              disabled={loading || connectionStatus !== 'connected'}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-semibold">Refresh</span>
            </button> */}
          </div>
        </div>

        {/* Tabs and Controls */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl mb-6 overflow-hidden">
          <div className="flex border-b border-slate-700/50 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 cursor-pointer font-semibold whitespace-nowrap transition-all duration-300 ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
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
                        className={`relative px-5 py-2 cursor-pointer rounded-md text-sm font-semibold transition-all duration-300 ${sort === option ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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

              {/* {data.length > 0 && (
                <div className="ml-auto text-sm text-slate-400 bg-slate-800/30 px-4 py-2 rounded-lg border border-slate-700/30">
                  Showing <span className="font-bold text-blue-400">{Math.min(data.length, 20)}</span> of <span className="font-semibold text-slate-300">{data.length}</span> records
                </div>
              )} */}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm animate-pulse">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
          {viewMode === 'grid' ? (
            <div className="flex-1 overflow-auto custom-scrollbar p-12">
              {loading && data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-ful">
                  <RefreshCw className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                  <p className="text-slate-300 font-semibold text-lg">Connecting to live data...</p>
                  <p className="text-xs text-slate-500 mt-2">Establishing real-time connection</p>
                </div>
              ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-slate-300 font-semibold text-lg">No data available</p>
                  <p className="text-xs text-slate-500 mt-2">Backend: {connectionStatus}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {data.slice(0, 20).map((item, index) => (
                    <GridCard key={item.symbol || index} item={item} index={index} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full">
                <thead className="bg-linear-to-r from-slate-800 to-slate-900 sticky top-0 z-10 shadow-lg">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Symbol</th>

                    {activeTab === 'volume-spurts' ? (
                      <>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">1 WK AVG.<br />VOLUME</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">No. of<br />Times</th>
                      </>
                    ) : activeTab === 'price-spurts' ? (
                      <>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Series</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">LTP</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">%CHNG</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br />(Shares)</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br />(₹ Lakhs)</th>
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
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br />(Shares)</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br />(₹ Lakhs)</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Open</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">High</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Low</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Prev. Close</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">LTP</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">%CHNG</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Volume<br />(Shares)</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">Value<br />(₹ Lakhs)</th>
                        {activeTab === 'main-board' && <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/50">CA</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {loading && data.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-30 text-center justify-center items-center ">
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
                            <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300" onClick={() => openStockDetailsPage(item)} >{item.symbol}</td>
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
                            <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300" onClick={() => openStockDetailsPage(item)}>{item.symbol}</td>
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
                            <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300" onClick={() => openStockDetailsPage(item)}>{item.symbol}</td>
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
                          <td className="px-6 py-4 text-sm font-bold text-blue-400 group-hover:text-blue-300" onClick={() => openStockDetailsPage(item)}>{item.symbol}</td>
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
          )}
        </div>
      </div>

    </div>
  );
};

export default MostActiveEquity;