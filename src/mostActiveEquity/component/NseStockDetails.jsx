import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Activity, Home, Maximize2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { StockChartData } from '../services/NseStockDetailsServices';

const NseStockDetails = () => {
  const [stockData, setStockData] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('area');
  const [loading, setLoading] = useState(true);
  const [zoomDomain, setZoomDomain] = useState(null);
  const [brushIndexes, setBrushIndexes] = useState({ startIndex: 0, endIndex: 100 });
  const chartContainerRef = useRef(null);
  const checkIntervalRef = useRef(null);


  console.log(new Date(1768906499000))

  // Load stock data from localStorage with live updates
  useEffect(() => {
    const loadStockData = () => {
      const chartSymbolHistory = JSON.parse(
        localStorage.getItem("chartSymbolHistory")
      );

      if (chartSymbolHistory) {
        StockChartData(chartSymbolHistory[0].symbol, timeRange)
          .then(response => {
            console.log("ttttttt", response);

            setStockData(response.data)
            setLoading(false)
          }).catch(error => {
            console.error("Error fetching stock chart data:", error)
            setLoading(false)
          });
      }
    };

    loadStockData();

    let checkCount = 0;
    checkIntervalRef.current = setInterval(() => {
      checkCount++;
      loadStockData();

      if (checkCount >= 10) {
        clearInterval(checkIntervalRef.current);
      }
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const chartData = useMemo(() => {
    if (!stockData || !stockData.grapthData || stockData.grapthData.length === 0) {
      return [];
    }

    return stockData.grapthData
      .map(([timestamp, price, status]) => ({
        timestamp,
        date: new Date(timestamp).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: timeRange === '1Y' || timeRange === '5Y' ? '2-digit' : undefined
        }),
        fullDate: new Date(timestamp).toLocaleDateString('en-IN'),
        price: parseFloat(price),
        status
      }))
      .reverse();
  }, [stockData, timeRange]);

  useEffect(() => {
    if (chartData.length > 0) {
      setBrushIndexes({ startIndex: 0, endIndex: chartData.length - 1 });
    }
  }, [chartData.length]);

  useEffect(() => {
    if (!chartData || chartData.length === 0) return;

    const handleWheel = (e) => {
      if (chartContainerRef.current && chartContainerRef.current.contains(e.target)) {
        e.preventDefault();

        const delta = e.deltaY;
        const currentStartIndex = brushIndexes.startIndex;
        const currentEndIndex = brushIndexes.endIndex;
        const range = currentEndIndex - currentStartIndex;

        if (delta < 0) {
          // Scroll up - Zoom In
          const newRange = Math.max(Math.floor(range * 0.85), 5);
          const center = Math.floor((currentStartIndex + currentEndIndex) / 2);
          const newStart = Math.max(0, center - Math.floor(newRange / 2));
          const newEnd = Math.min(chartData.length - 1, newStart + newRange);

          setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
          setZoomDomain([newStart, newEnd]);
        } else {
          // Scroll down - Zoom Out
          const newRange = Math.min(Math.floor(range * 1.15), chartData.length);
          const center = Math.floor((currentStartIndex + currentEndIndex) / 2);
          const newStart = Math.max(0, center - Math.floor(newRange / 2));
          const newEnd = Math.min(chartData.length - 1, newStart + newRange);

          setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
          setZoomDomain([newStart, newEnd]);
        }
      }
    };

    const chartElement = chartContainerRef.current;
    if (chartElement) {
      chartElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (chartElement) {
        chartElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [brushIndexes, chartData]);

  // Calculate statistics based on visible data (zoom level)
  const stats = useMemo(() => {
    if (!stockData) {
      return {
        current: '0.00',
        change: '0.00',
        changePercent: '0.00',
        high: '0.00',
        low: '0.00',
        avgPrice: '0.00',
        isPositive: true,
        dataPoints: 0
      };
    }

    // Use stockData values for current stats
    const current = stockData.ltp || stockData.closePrice || 0;
    const change = stockData.pChange ? (current * stockData.pChange / 100) : 0;
    const changePercent = stockData.pChange || 0;

    // Calculate chart-based stats from visible data
    if (chartData.length === 0) {
      return {
        current: current.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        high: (stockData.high || current).toFixed(2),
        low: (stockData.low || current).toFixed(2),
        avgPrice: current.toFixed(2),
        isPositive: changePercent >= 0,
        dataPoints: 0
      };
    }

    const visibleData = zoomDomain
      ? chartData.slice(brushIndexes.startIndex, brushIndexes.endIndex + 1)
      : chartData;

    if (visibleData.length === 0) {
      return {
        current: current.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        high: (stockData.high || current).toFixed(2),
        low: (stockData.low || current).toFixed(2),
        avgPrice: current.toFixed(2),
        isPositive: changePercent >= 0,
        dataPoints: 0
      };
    }

    const prices = visibleData.map(d => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

    return {
      current: current.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      avgPrice,
      isPositive: changePercent >= 0,
      dataPoints: visibleData.length
    };
  }, [stockData, chartData, zoomDomain, brushIndexes]);

  const timeRanges = ['1D', '1W', '1M', '1Y', '5Y'];

  const handleBrushChange = (brushData) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setBrushIndexes({ startIndex: brushData.startIndex, endIndex: brushData.endIndex });
      setZoomDomain([brushData.startIndex, brushData.endIndex]);
    }
  };

  const handleZoomIn = () => {
    const { startIndex, endIndex } = brushIndexes;
    const range = endIndex - startIndex;
    const newRange = Math.max(Math.floor(range * 0.7), 5);
    const center = Math.floor((startIndex + endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);

    setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
    setZoomDomain([newStart, newEnd]);
  };

  const handleZoomOut = () => {
    const { startIndex, endIndex } = brushIndexes;
    const range = endIndex - startIndex;
    const newRange = Math.min(Math.floor(range * 1.43), chartData.length);
    const center = Math.floor((startIndex + endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);

    setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
    setZoomDomain([newStart, newEnd]);
  };

  const handleResetZoom = () => {
    if (chartData.length > 0) {
      setBrushIndexes({ startIndex: 0, endIndex: chartData.length - 1 });
      setZoomDomain(null);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-slate-400 mb-1">{data.fullDate}</p>
          <p className="text-lg font-bold text-white">₹{data.price.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const formatNumber = (num) => {
    if (!num) return '0.00';
    return parseFloat(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const goBack = () => {
    window.close();
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  if (loading) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 font-semibold">Loading stock details...</p>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 font-semibold text-xl mb-4">No stock data available</p>
          <button
            onClick={goBack}
            className="px-6 py-3 bg-linear-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-500 hover:to-violet-500 transition-all"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }


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
        
        /* Smooth zoom animation */
        .recharts-surface {
          transition: transform 0.2s ease-out;
        }
      `}</style>

      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 group"
              title="Back to Dashboard"
            >
              <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            </button>
            <div className="p-2.5 bg-linear-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                {stockData.name || stockData.symbol}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                {stockData.identifier || stockData.symbol}
                {stockData.series && (
                  <>
                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                    <span>{stockData.series}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-white">₹{formatNumber(stockData.ltp || stockData.closePrice)}</div>
            <div className={`flex items-center justify-end gap-2 text-base font-semibold ${stats.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.isPositive ? '+' : ''}{stats.change} ({stats.isPositive ? '+' : ''}{stats.changePercent}%)
            </div>
          </div>
        </div>

        {/* Main Content - Chart Left, Info Right */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Left Side - Chart */}
          <div className="col-span-9 flex flex-col min-h-0">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col h-full">
              {/* Chart Controls */}
              <div className="border-b border-slate-700/50 bg-slate-800/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-300">Historical Data</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <button
                        onClick={handleZoomIn}
                        disabled={chartData.length === 0}
                        className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleZoomOut}
                        disabled={chartData.length === 0}
                        className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleResetZoom}
                        disabled={chartData.length === 0}
                        className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reset Zoom"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      {timeRanges.map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${timeRange === range ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                          {timeRange === range && (
                            <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                          )}
                          <span className="relative z-10">{range}</span>
                        </button>
                      ))}
                    </div>

                    {/* Chart Type Selector */}
                    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <button
                        onClick={() => setChartType('area')}
                        className={`relative p-1.5 rounded-md transition-all duration-300 ${chartType === 'area' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        title="Area Chart"
                      >
                        {chartType === 'area' && (
                          <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                        )}
                        <Activity className="w-4 h-4 relative z-10" />
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={`relative p-1.5 rounded-md transition-all duration-300 ${chartType === 'line' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        title="Line Chart"
                      >
                        {chartType === 'line' && (
                          <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                        )}
                        <TrendingUp className="w-4 h-4 relative z-10" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div
                ref={chartContainerRef}
                className="flex-1 p-4 bg-linear-to-br from-slate-900/30 to-slate-800/20 relative group"
              >
                {/* Zoom Indicator */}
                <div className="absolute top-6 right-6 z-10 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <ZoomIn className="w-3 h-3" />
                    <span>Scroll to zoom</span>
                  </p>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 font-semibold">No historical data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#475569' }}
                          domain={zoomDomain || ['dataMin', 'dataMax']}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#475569' }}
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => `₹${value.toFixed(0)}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#colorPrice)"
                          animationDuration={800}
                        />
                        <Brush
                          dataKey="date"
                          height={30}
                          stroke="#3b82f6"
                          fill="#1e293b"
                          onChange={handleBrushChange}
                          startIndex={brushIndexes.startIndex}
                          endIndex={brushIndexes.endIndex}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#475569' }}
                          domain={zoomDomain || ['dataMin', 'dataMax']}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#475569' }}
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => `₹${value.toFixed(0)}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ fill: '#3b82f6', r: 3 }}
                          activeDot={{ r: 5, fill: '#8b5cf6' }}
                          animationDuration={800}
                        />
                        <Brush
                          dataKey="date"
                          height={30}
                          stroke="#3b82f6"
                          fill="#1e293b"
                          onChange={handleBrushChange}
                          startIndex={brushIndexes.startIndex}
                          endIndex={brushIndexes.endIndex}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>

              {/* Note */}
              <div className="border-t border-slate-700/30 bg-slate-800/20 px-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 italic">
                    Note: Prices are historically not adjusted for corporate actions.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ZoomIn className="w-3 h-3" />
                    <span>Scroll wheel to zoom • Drag brush to select range</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Stats & Info */}
          <div className="col-span-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-lg border border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-slate-800/50 rounded-lg">
                    <Activity className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Open</span>
                </div>
                <div className="text-lg font-bold text-slate-200">₹{formatNumber(stockData.open)}</div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl rounded-lg border border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-slate-800/50 rounded-lg">
                    <BarChart3 className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Prev Close</span>
                </div>
                <div className="text-lg font-bold text-slate-200">₹{formatNumber(stockData.prevClose)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-lg border border-emerald-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">High</span>
                </div>
                <div className="text-lg font-bold text-emerald-400">₹{stats.high}</div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl rounded-lg border border-red-500/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-red-500/10 rounded-lg">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Low</span>
                </div>
                <div className="text-lg font-bold text-red-400">₹{stats.low}</div>
              </div>
            </div>

            {/* Trade Information */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Trade Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Symbol</span>
                  <span className="font-semibold text-slate-200">{stockData.identifier}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Close Price</span>
                  <span className="font-semibold text-slate-200">₹{formatNumber(stockData.closePrice)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-semibold text-slate-200">{stockData.volume?.toLocaleString('en-IN') || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">Value (₹L)</span>
                  <span className="font-semibold text-slate-200">{formatNumber(stockData.value) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Historical Data */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                Historical Data
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Data Points</span>
                  <span className="font-semibold text-slate-200">{stats.dataPoints || chartData.length}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Period</span>
                  <span className="font-semibold text-slate-200">{timeRange}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">Avg Price</span>
                  <span className="font-semibold text-slate-200">₹{stats.avgPrice}</span>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                Performance
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                  <span className="text-slate-500">Change</span>
                  <span className={`font-semibold ${stats.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.isPositive ? '+' : ''}{stats.change}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">Change %</span>
                  <span className={`font-semibold ${stats.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.isPositive ? '+' : ''}{stats.changePercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NseStockDetails;