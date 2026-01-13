import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Calendar, DollarSign, Activity, BarChart3, LineChart, PieChart, Award, AlertCircle, CheckCircle, Clock, Sparkles, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

const StockHistoricalDashboard = () => {
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [period, setPeriod] = useState('1year');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [stockData, setStockData] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // overview, historical, corporate, financial

  const API_BASE = 'http://localhost:5000';

  const periods = [
    { value: '1month', label: '1M' },
    { value: '3month', label: '3M' },
    { value: '6month', label: '6M' },
    { value: '1year', label: '1Y' },
    { value: 'max', label: 'MAX' }
  ];

  const popularStocks = [
    'TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK', 
    'WIPRO', 'ITC', 'SBIN', 'BHARTIARTL', 'HINDUNILVR'
  ];

  const fetchCompleteData = async (symbol) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/market/stock/${symbol}/complete?period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setStockData(result.data);
        setSelectedSymbol(symbol);
      } else {
        setError(result.message || 'Failed to fetch stock data');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      fetchCompleteData(searchSymbol.toUpperCase());
    }
  };

  const handlePopularStock = (symbol) => {
    setSearchSymbol(symbol);
    fetchCompleteData(symbol);
  };

  useEffect(() => {
    if (selectedSymbol) {
      fetchCompleteData(selectedSymbol);
    }
  }, [period]);

  const formatNumber = (num) => {
    if (!num) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol) => {
    if (!vol) return '0';
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)}Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)}L`;
    return vol.toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calculatePerformance = () => {
    if (!stockData?.historical || stockData.historical.length < 2) return null;
    
    const data = [...stockData.historical].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return {
      firstPrice,
      lastPrice,
      change,
      changePercent,
      isPositive: change >= 0
    };
  };

  const OverviewView = () => {
    const quote = stockData?.quote;
    const performance = calculatePerformance();
    const isPositive = quote?.pChange >= 0;

    return (
      <div className="space-y-6">
        {/* Main Price Card */}
        <div className="bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{quote?.companyName || selectedSymbol}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 font-semibold">{quote?.symbol}</span>
                <div className="h-1 w-1 rounded-full bg-slate-600"></div>
                <span className="text-sm text-slate-400">{quote?.industry}</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {isPositive ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-red-400" />}
              <span className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{formatNumber(quote?.pChange)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-5xl font-bold text-white mb-2">₹{formatNumber(quote?.currentPrice)}</div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatNumber(quote?.change)}
                </span>
                <span className="text-sm text-slate-500">({formatDate(new Date().toISOString())})</span>
              </div>
            </div>

            {performance && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <div className="text-xs text-slate-400 mb-2">{period.toUpperCase()} Performance</div>
                <div className={`text-2xl font-bold mb-1 ${performance.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {performance.isPositive ? '+' : ''}{formatNumber(performance.changePercent)}%
                </div>
                <div className="text-sm text-slate-500">
                  ₹{formatNumber(performance.firstPrice)} → ₹{formatNumber(performance.lastPrice)}
                </div>
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Open</div>
              <div className="text-lg font-bold text-slate-200">₹{formatNumber(quote?.open)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">High</div>
              <div className="text-lg font-bold text-emerald-400">₹{formatNumber(quote?.high)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Low</div>
              <div className="text-lg font-bold text-red-400">₹{formatNumber(quote?.low)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">Prev. Close</div>
              <div className="text-lg font-bold text-slate-200">₹{formatNumber(quote?.previousClose)}</div>
            </div>
          </div>
        </div>

        {/* 52 Week Range & Volume */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white">52 Week Range</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">High</span>
                <span className="text-xl font-bold text-emerald-400">₹{formatNumber(quote?.week52High)}</span>
              </div>
              <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
                  style={{ 
                    width: `${((quote?.currentPrice - quote?.week52Low) / (quote?.week52High - quote?.week52Low)) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Low</span>
                <span className="text-xl font-bold text-red-400">₹{formatNumber(quote?.week52Low)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Trading Volume</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Volume</span>
                <span className="text-2xl font-bold text-blue-400">{formatVolume(quote?.volume)}</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30">
                <div className="text-xs text-slate-500 mb-2">Additional Info</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400">ISIN</div>
                    <div className="text-sm font-mono text-slate-300">{quote?.isin || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Listed Since</div>
                    <div className="text-sm text-slate-300">{formatDate(quote?.listingDate)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Data Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
              <div className="text-3xl font-bold text-blue-400 mb-1">{stockData?.historical?.length || 0}</div>
              <div className="text-xs text-slate-400">Historical Records</div>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{stockData?.corporateActions?.length || 0}</div>
              <div className="text-xs text-slate-400">Corporate Actions</div>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
              <div className="text-3xl font-bold text-violet-400 mb-1">{stockData?.financialResults?.length || 0}</div>
              <div className="text-xs text-slate-400">Financial Results</div>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
              <div className="text-3xl font-bold text-amber-400 mb-1">{period.toUpperCase()}</div>
              <div className="text-xs text-slate-400">Selected Period</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HistoricalView = () => {
    const historical = stockData?.historical || [];
    const sortedData = [...historical].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <LineChart className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Historical Price Data</h3>
              <p className="text-sm text-slate-400">{sortedData.length} records for {period}</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-auto max-h-[600px] custom-scrollbar">
          <table className="w-full">
            <thead className="bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-300">Date</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Open</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">High</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Low</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Close</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Volume</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Value (₹L)</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-300">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {sortedData.map((item, index) => {
                const prevClose = index < sortedData.length - 1 ? sortedData[index + 1].close : item.open;
                const change = item.close - prevClose;
                const isPositive = change >= 0;

                return (
                  <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-200">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-300">₹{formatNumber(item.open)}</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-400">₹{formatNumber(item.high)}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-400">₹{formatNumber(item.low)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-white">₹{formatNumber(item.close)}</span>
                        <span className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          ({isPositive ? '+' : ''}{formatNumber((change / prevClose) * 100)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{formatVolume(item.volume)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{formatNumber(item.value / 100000)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{item.trades?.toLocaleString() || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CorporateActionsView = () => {
    const actions = stockData?.corporateActions || [];

    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Corporate Actions</h3>
              <p className="text-sm text-slate-400">{actions.length} total actions</p>
            </div>
          </div>
        </div>

        {actions.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No corporate actions found for this stock</p>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-h-[600px] overflow-auto custom-scrollbar">
            {actions.map((action, index) => (
              <div key={index} className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{action.subject}</h4>
                      <p className="text-sm text-slate-400">{action.purpose || 'Corporate Action'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {action.exDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Ex-Date</div>
                      <div className="text-sm font-semibold text-slate-200">{formatDate(action.exDate)}</div>
                    </div>
                  )}
                  {action.recordDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Record Date</div>
                      <div className="text-sm font-semibold text-slate-200">{formatDate(action.recordDate)}</div>
                    </div>
                  )}
                  {action.bcStartDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">BC Start</div>
                      <div className="text-sm font-semibold text-slate-200">{formatDate(action.bcStartDate)}</div>
                    </div>
                  )}
                  {action.bcEndDate && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">BC End</div>
                      <div className="text-sm font-semibold text-slate-200">{formatDate(action.bcEndDate)}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const FinancialResultsView = () => {
    const results = stockData?.financialResults || [];

    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <PieChart className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Financial Results</h3>
              <p className="text-sm text-slate-400">{results.length} quarterly/annual results</p>
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No financial results found for this stock</p>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-h-[600px] overflow-auto custom-scrollbar">
            {results.map((result, index) => (
              <div key={index} className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30 hover:border-violet-500/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Calendar className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">
                        {formatDate(result.fromDate)} - {formatDate(result.toDate)}
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">Financial Period</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {result.audited === 'Yes' && (
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
                        Audited
                      </span>
                    )}
                    {result.cumulative === 'Yes' && (
                      <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-400">
                        Cumulative
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Result Date</div>
                    <div className="text-sm font-semibold text-slate-200">{formatDate(result.reDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Broadcast Date</div>
                    <div className="text-sm font-semibold text-slate-200">{formatDate(result.broadcastDate)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(96, 165, 250), rgb(167, 139, 250));
        }
      `}</style>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Stock Historical Analysis
            </h1>
            <p className="text-sm text-slate-400 mt-1">Complete stock data with historical prices, corporate actions, and financial results</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  placeholder="Enter stock symbol (e.g., TCS, RELIANCE, INFY)"
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchSymbol.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Popular Stocks */}
        {!selectedSymbol && (
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Popular Stocks - Click to view</h3>
            <div className="flex flex-wrap gap-3">
              {popularStocks.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => handlePopularStock(symbol)}
                  className="px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 rounded-lg text-sm font-semibold text-slate-300 hover:text-blue-400 transition-all"
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {selectedSymbol && stockData && (
        <div className="max-w-7xl mx-auto">
          {/* Period Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`relative px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                    period === p.value ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {period === p.value && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 rounded-md shadow-lg"></div>
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm font-semibold text-blue-400">Loading...</span>
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 mb-6 overflow-hidden">
            <div className="flex border-b border-slate-700/50 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: DollarSign },
                { id: 'historical', label: 'Historical Data', icon: LineChart },
                { id: 'corporate', label: 'Corporate Actions', icon: Award },
                { id: 'financial', label: 'Financial Results', icon: PieChart }
              ].map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`relative px-6 py-4 font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeView === view.id ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="relative z-10">{view.label}</span>
                    {activeView === view.id && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 shadow-lg"></div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* View Content */}
          <div>
            {activeView === 'overview' && <OverviewView />}
            {activeView === 'historical' && <HistoricalView />}
            {activeView === 'corporate' && <CorporateActionsView />}
            {activeView === 'financial' && <FinancialResultsView />}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedSymbol && !error && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-16 text-center">
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Search for a Stock</h3>
            <p className="text-slate-400 mb-6">Enter a stock symbol to view detailed historical data, corporate actions, and financial results</p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Real-time data</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Historical analysis</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Corporate actions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockHistoricalDashboard;