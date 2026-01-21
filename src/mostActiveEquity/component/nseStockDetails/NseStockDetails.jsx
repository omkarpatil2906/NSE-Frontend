// components/NseStockDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Home, ArrowUpRight, ArrowDownRight, Clock, Activity, Calendar } from 'lucide-react';
import stockDetailsSocket from '../../util/socket/StockDetailsSocket';
import TradeInformation from './TradeInformation';
import HistoricalData from './HistoricalData';
import { StockInfoData } from '../../services/NseStockDetailsServices';

const NseStockDetails = () => {
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [activeTab, setActiveTab] = useState('trade');
  const [timeRange, setTimeRange] = useState('1D');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  
  // Use ref to track if initial fetch is done
  const initialFetchDone = useRef(false);
  const socketInitialized = useRef(false);

  // Fetch initial stock info from API ONLY ONCE
  useEffect(() => {
    if (initialFetchDone.current) return;
    
    const fetchStockInfo = async () => {
      try {
        const chartSymbolHistory = JSON.parse(localStorage.getItem("chartSymbolHistory"));
        
        if (!chartSymbolHistory || chartSymbolHistory.length === 0) {
          throw new Error('No stock symbol found in localStorage');
        }

        const symbol = chartSymbolHistory[0].symbol;
        
        // Fetch stock info from API
        const response = await StockInfoData(symbol);
        const stockInfoData = response.data.data.equityResponse[0];
        
        setStockInfo(stockInfoData);
        setLoading(false);
        initialFetchDone.current = true;
      } catch (err) {
        console.error('Error fetching stock info:', err);
        setError(err.message || 'Failed to load stock information');
        setLoading(false);
      }
    };

    fetchStockInfo();
  }, []); // Empty dependency array - run only once

  // Setup socket connection ONLY ONCE when stockInfo is available
  useEffect(() => {
    if (!stockInfo || socketInitialized.current) return;

    console.log('🚀 Setting up socket connection for:', stockInfo.metaData?.symbol);
    socketInitialized.current = true;

    // Connect to socket
    stockDetailsSocket.connect();

    // Socket event listeners
    const unsubscribeConnected = stockDetailsSocket.on('connected', (data) => {
      console.log('✅ Socket connected:', data.socketId);
      setSocketStatus('connected');
      setError(null);
      
      // Subscribe to stock updates for chart data
      const symbol = stockInfo.metaData?.symbol;
      if (symbol) {
        stockDetailsSocket.subscribe(symbol, timeRange, 'chart');
      }
    });

    const unsubscribeDisconnected = stockDetailsSocket.on('disconnected', (data) => {
      console.log('❌ Socket disconnected:', data.reason);
      setSocketStatus('disconnected');
    });

    const unsubscribeStockUpdate = stockDetailsSocket.on('stockUpdate', (data) => {
      console.log('📊 Stock update received:', data.type, 'dataType:', data.dataType);
      
      // Handle different data types
      if (data.dataType === 'chart') {
        if (data.type === 'initial') {
          setChartData(data.data);
          console.log('✅ Initial chart data loaded');
        } else if (data.type === 'update') {
          setChartData(prevData => {
            if (!prevData) return data.data;
            
            // Apply incremental changes
            const updatedData = { ...prevData };
            const changes = data.changes;
            
            if (changes.added?.length > 0) {
              updatedData.graphData = [...(prevData.graphData || []), ...changes.added];
              console.log(`➕ Added ${changes.added.length} new data points`);
            }
            
            if (changes.updated?.length > 0) {
              const updatedMap = new Map(changes.updated.map(item => [item[0], item]));
              updatedData.graphData = (prevData.graphData || []).map(item => 
                updatedMap.has(item[0]) ? updatedMap.get(item[0]) : item
              );
              console.log(`🔄 Updated ${changes.updated.length} data points`);
            }
            
            if (changes.removed?.length > 0) {
              const removedSet = new Set(changes.removed);
              updatedData.graphData = (prevData.graphData || []).filter(
                item => !removedSet.has(item[0])
              );
              console.log(`➖ Removed ${changes.removed.length} data points`);
            }
            
            return updatedData;
          });
        }
      } else if (data.dataType === 'live') {
        setLiveData(data.data);
        console.log('✅ Live data updated');
      }
      
      setLastUpdate(new Date(data.timestamp));
    });

    const unsubscribeError = stockDetailsSocket.on('error', (data) => {
      console.error('❌ Socket error:', data.error);
      setError(data.error);
      
      if (data.type === 'connection' && data.attempts >= 3) {
        setSocketStatus('error');
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeStockUpdate();
      unsubscribeError();
      stockDetailsSocket.disconnect();
      socketInitialized.current = false;
    };
  }, [stockInfo]); // Only depend on stockInfo

  // Handle time range changes
  useEffect(() => {
    if (!stockInfo || !socketInitialized.current || socketStatus !== 'connected') return;
    
    const symbol = stockInfo.metaData?.symbol;
    if (symbol) {
      console.log(`🔄 Changing time range to: ${timeRange}`);
      // Only subscribe to chart data when time range changes
      stockDetailsSocket.subscribe(symbol, timeRange, 'chart');
    }
  }, [timeRange]); // Only depend on timeRange

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
  if (loading) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading stock data...</p>
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
                  {stockInfo.metaData?.companyName || 'Stock Details'}
                </h1>
                <span className="text-sm text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                  {stockInfo.metaData?.isinCode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              socketStatus === 'connected' 
                ? 'bg-green-500/10 border-green-500/30' 
                : socketStatus === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-800/30 border-slate-700/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                socketStatus === 'connected' 
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
                ₹{stockInfo.metaData?.averagePrice || '0.00'}
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
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'trade' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'historical' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
        <div className="flex-1 overflow-hidden">
          {activeTab === 'historical' ? (
            <HistoricalData 
              stockInfo={stockInfo}
              chartData={chartData}
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