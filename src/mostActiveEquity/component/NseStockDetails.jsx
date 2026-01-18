import React, { useState, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Activity, ArrowLeft, Maximize2 } from 'lucide-react';

const NseStockDetails = ({ stockData, onBack }) => {
  // Sample data - replace with your actual data
  const sampleData = stockData || {
    identifier: "SILVERBEESEQN",
    name: "SILVERBEES",
    closePrice: 269.44,
    grapthData: [
      [1768521600000, 269.4, "NM"],
      [1768348800000, 263.99, "NM"],
      [1768262400000, 249.45, "NM"],
      [1768176000000, 243.75, "NM"],
      [1767916800000, 229.85, "NM"],
      [1767830400000, 224.25, "NM"],
      [1767744000000, 234.09, "NM"],
      [1767657600000, 232.01, "NM"],
      [1767571200000, 226.2, "NM"],
      [1767312000000, 222.19, "NM"],
      [1767225600000, 215, "NM"],
      [1767139200000, 215.8, "NM"],
      [1767052800000, 219, "NM"],
      [1766966400000, 218, "NM"],
      [1766707200000, 222, "NM"],
      [1766534400000, 209.5, "NM"],
      [1766448000000, 201.93, "NM"],
      [1766361600000, 200.25, "NM"],
      [1766102400000, 191.97, "NM"]
    ]
  };

  const [timeRange, setTimeRange] = useState('1M');
  const [chartType, setChartType] = useState('area');

  // Transform data for Recharts
  const chartData = useMemo(() => {
    return sampleData.grapthData
      .map(([timestamp, price, status]) => ({
        timestamp,
        date: new Date(timestamp).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short',
          year: timeRange === '1Y' ? '2-digit' : undefined
        }),
        price: parseFloat(price),
        status
      }))
      .reverse(); // Reverse to show chronological order
  }, [sampleData.grapthData, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const prices = chartData.map(d => d.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = lastPrice - firstPrice;
    const changePercent = ((change / firstPrice) * 100).toFixed(2);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

    return {
      current: lastPrice.toFixed(2),
      change: change.toFixed(2),
      changePercent,
      high: high.toFixed(2),
      low: low.toFixed(2),
      avgPrice,
      isPositive: change >= 0
    };
  }, [chartData]);

  const timeRanges = ['1D', '1W', '1M', '1Y', '5Y'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-slate-400 mb-1">{data.date}</p>
          <p className="text-lg font-bold text-white">₹{data.price.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-6 h-6 text-slate-400" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                {sampleData.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1">{sampleData.identifier}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-white">₹{stats.current}</div>
              <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${stats.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {stats.isPositive ? '+' : ''}{stats.change} ({stats.isPositive ? '+' : ''}{stats.changePercent}%)
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 font-semibold">High</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">₹{stats.high}</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400 font-semibold">Low</span>
            </div>
            <div className="text-2xl font-bold text-red-400">₹{stats.low}</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 font-semibold">Avg Price</span>
            </div>
            <div className="text-2xl font-bold text-slate-200">₹{stats.avgPrice}</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400 font-semibold">Data Points</span>
            </div>
            <div className="text-2xl font-bold text-slate-200">{chartData.length}</div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Chart Controls */}
          <div className="border-b border-slate-700/50 bg-slate-800/30 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-300">Time Range</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Time Range Selector */}
                <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  {timeRanges.map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`relative px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 ${
                        timeRange === range ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
                    className={`relative p-2 rounded-md transition-all duration-300 ${
                      chartType === 'area' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {chartType === 'area' && (
                      <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-violet-600 rounded-md shadow-lg shadow-blue-500/30"></div>
                    )}
                    <Activity className="w-4 h-4 relative z-10" />
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`relative p-2 rounded-md transition-all duration-300 ${
                      chartType === 'line' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
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
          <div className="p-6 bg-linear-to-br from-slate-900/30 to-slate-800/20">
            <ResponsiveContainer width="100%" height={450}>
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fill="url(#colorPrice)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6, fill: '#8b5cf6' }}
                    animationDuration={1000}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Note */}
          <div className="border-t border-slate-700/30 bg-slate-800/20 px-6 py-3">
            <p className="text-xs text-slate-500 italic">
              Note: Prices on the graph are historically not adjusted for corporate actions.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Trade Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Symbol</span>
                <span className="font-semibold text-slate-200">{sampleData.identifier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Close Price</span>
                <span className="font-semibold text-slate-200">₹{formatNumber(sampleData.closePrice)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              Historical Data
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Data Points</span>
                <span className="font-semibold text-slate-200">{chartData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Period</span>
                <span className="font-semibold text-slate-200">{timeRange}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              Performance
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Change</span>
                <span className={`font-semibold ${stats.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.isPositive ? '+' : ''}{stats.change}
                </span>
              </div>
              <div className="flex justify-between">
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
  );
};

export default NseStockDetails;