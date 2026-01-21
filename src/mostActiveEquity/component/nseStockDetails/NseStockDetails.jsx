// components/NseStockDetails.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, Home, ArrowUpRight, ArrowDownRight, Clock, Activity, Calendar } from 'lucide-react';
import stockDetailsSocket from '../../util/socket/StockDetailsSocket';
import TradeInformation from './TradeInformation';
import HistoricalData from './HistoricalData';

const NseStockDetails = () => {
  // Get symbol and identifier from localStorage
  const getStockFromLocalStorage = () => {
    try {
      const chartSymbolHistory = JSON.parse(localStorage.getItem("chartSymbolHistory"));
      if (chartSymbolHistory && chartSymbolHistory.length > 0) {
        return chartSymbolHistory[0]; // Get the first (most recent) symbol
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return null;
  };

  const stockData = getStockFromLocalStorage();
  const symbol = stockData?.symbol; // For quote API
  const identifier = stockData?.identifier; // For chart API

  // State management
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [activeTab, setActiveTab] = useState('trade');
  const [timeRange, setTimeRange] = useState('1D');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  console.log(chartData);


  // Chart subscription (for TradeInformation tab)
  useEffect(() => {
    if (activeTab !== 'trade' || !identifier) return;

    console.log(`🔄 [Chart] Subscribing to ${identifier} with duration ${timeRange}`);
    setLoading(true);

    // Unsubscribe from previous subscription
    stockDetailsSocket.unsubscribe();

    // Subscribe to chart data using identifier
    stockDetailsSocket.subscribeChart(identifier, timeRange);

    return () => {
      console.log('🧹 Cleaning up chart subscription');
      stockDetailsSocket.unsubscribe();
    };
  }, [identifier, timeRange, activeTab]);

  // Live quote subscription (runs continuously for real-time price updates)
  useEffect(() => {
    if (!symbol) return;

    console.log(`🔄 [Quote] Subscribing to live quote for ${symbol}`);

    // Connect and subscribe to live quote
    const quoteSocket = stockDetailsSocket.connect();

    // Small delay to ensure connection
    setTimeout(() => {
      stockDetailsSocket.subscribeQuote(symbol, 'N', 'EQ');
    }, 500);

    return () => {
      console.log('🧹 Cleaning up quote subscription');
    };
  }, [symbol]);

  // Socket event listeners
  useEffect(() => {
    console.log('🚀 Setting up StockDetails socket listeners...');

    // Connection status handler
    const handleConnectionStatus = (status) => {
      console.log('📡 Connection status:', status);
      setSocketStatus(status);
      if (status === 'connected') {
        setError(null);
      }
    };

    // Stock details update handler
    const handleStockDetailsUpdate = (payload) => {
      console.log('📊 Stock update received:', payload.type, payload.dataType);

      if (payload.type === 'initial' || payload.type === 'update') {
        switch (payload.dataType) {
          case 'chart':
            console.log('📈 Chart data updated');
            setChartData(payload.data);
            setLoading(false);
            break;

          case 'quote':
            console.log('💰 Quote data updated');
            setStockInfo(payload.data?.equityResponse[0] || []);
            setLoading(false);
            break;

          case 'historical':
            console.log('📅 Historical data updated');
            // Handle historical data if needed
            break;

          default:
            console.warn('Unknown data type:', payload.dataType);
        }

        setLastUpdate(new Date(payload.timestamp));
        setError(null);
      }
    };

    // Error handler
    const handleError = (errorMsg) => {
      console.error('❌ Socket error:', errorMsg);
      setError(errorMsg);
      setLoading(false);
    };

    // Register listeners
    stockDetailsSocket.on('connectionStatus', handleConnectionStatus);
    stockDetailsSocket.on('stockDetailsUpdate', handleStockDetailsUpdate);
    stockDetailsSocket.on('error', handleError);

    // Setup ping interval
    const pingInterval = setInterval(() => {
      if (stockDetailsSocket.isConnected()) {
        stockDetailsSocket.ping();
      }
    }, 15000);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting - Cleaning up...');
      clearInterval(pingInterval);
      stockDetailsSocket.off('connectionStatus', handleConnectionStatus);
      stockDetailsSocket.off('stockDetailsUpdate', handleStockDetailsUpdate);
      stockDetailsSocket.off('error', handleError);
      stockDetailsSocket.disconnect();
    };
  }, []); // Empty dependency - runs once on mount

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const goBack = () => {
    window.close();
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  // Loading state
  if (loading && !stockData) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-2">No stock selected</p>
          <p className="text-slate-400 text-sm mb-4">Please select a stock from the dashboard</p>
          <button
            onClick={goBack}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading stock data...</p>
          <p className="text-slate-500 text-sm mt-2">Connecting to live stream...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stockInfo) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-2">Error loading stock data</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={goBack}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No stock info available
  if (!stockInfo) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold mb-4">No stock data available</p>
          <button
            onClick={goBack}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isNegative = parseFloat(stockInfo.metaData?.pChange || 0) < 0;
  const priceChangeColor = isNegative ? 'text-red-500' : 'text-green-500';
  const bgChangeColor = isNegative ? 'bg-red-500/10' : 'bg-green-500/10';
  const borderChangeColor = isNegative ? 'border-red-500/30' : 'border-green-500/30';

  return (
    <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(59, 130, 246), rgb(139, 92, 246));
          border-radius: 10px;
        }
      `}</style>

      <div className="h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="p-2.5 hover:bg-slate-800/50 rounded-xl transition-all duration-200 group border border-slate-700/50"
              title="Back to Dashboard"
            >
              <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            </button>

            <div className="p-3 bg-linear-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  {stockInfo.metaData?.companyName || symbol || 'Loading...'}
                </h1>
                <span className="text-sm text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                  {symbol || identifier || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${socketStatus === 'connected'
              ? 'bg-green-500/10 border-green-500/30'
              : socketStatus === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-800/30 border-slate-700/30'
              }`}>
              <div className={`w-2 h-2 rounded-full ${socketStatus === 'connected'
                ? 'bg-green-500 animate-pulse'
                : socketStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-slate-500'
                }`}></div>
              <span className="text-xs text-slate-400 font-medium">
                {socketStatus === 'connected' ? 'Live' : socketStatus === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>

            {/* Last Update Timestamp */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-700/30">
                <Clock className="w-3 h-3" />
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Info Card */}
        <div className={`${bgChangeColor} border ${borderChangeColor} rounded-2xl p-6 mb-6 backdrop-blur-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <h2 className="text-5xl font-bold text-white">
                ₹{stockInfo.metaData?.averagePrice || stockInfo.priceInfo?.ltp || '0.00'}
              </h2>
              <div className={`flex items-center gap-2 ${priceChangeColor} text-xl font-semibold`}>
                {isNegative ? (
                  <ArrowDownRight className="w-6 h-6" />
                ) : (
                  <ArrowUpRight className="w-6 h-6" />
                )}
                <span>{stockInfo.metaData?.pChange || '0.00'}%</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Open</p>
                <p className="text-lg font-semibold text-slate-200">
                  ₹{stockInfo.priceInfo?.open || '0.00'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">High</p>
                <p className="text-lg font-semibold text-green-400">
                  ₹{stockInfo.priceInfo?.high || '0.00'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Low</p>
                <p className="text-lg font-semibold text-red-400">
                  ₹{stockInfo.priceInfo?.low || '0.00'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Prev Close</p>
                <p className="text-lg font-semibold text-slate-200">
                  ₹{stockInfo.priceInfo?.prevClose || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleTabChange('trade')}
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'trade' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            {activeTab === 'trade' && (
              <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-xl shadow-lg shadow-blue-500/30"></div>
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Trade Information
            </span>
          </button>

          <button
            onClick={() => handleTabChange('historical')}
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'historical' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            {activeTab === 'historical' && (
              <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-xl shadow-lg shadow-blue-500/30"></div>
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Historical Data
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="">
          {activeTab === 'historical' ? (
            <HistoricalData
              symbol={symbol}
              identifier={identifier}
              stockInfo={stockInfo}
            />
          ) : (
            <TradeInformation
              chartData={chartData}
              stockInfo={stockInfo}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NseStockDetails;