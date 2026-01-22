import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown } from 'lucide-react';
import stockDetailsSocket from '../../util/socket/StockDetailsSocket';
import { format, subDays } from 'date-fns';

function HistoricalData() {
    const [activeSubTab, setActiveSubTab] = useState('trade');
    const [timeRange, setTimeRange] = useState('1D');
    const [tradeData, setTradeData] = useState([]);
    const [bulkBlockData, setBulkBlockData] = useState([]);
    const [periodicData, setPeriodicData] = useState(null);
    const [periodicYears, setPeriodicYears] = useState([]);
    const [periodicType, setPeriodicType] = useState('weekly52');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState('01');
    const [loading, setLoading] = useState(false);

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

    const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [fromDate, setFromDate] = useState(
        format(subDays(new Date(), 1), 'yyyy-MM-dd')
    );


    const timeRanges = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
    };

    // Format date to DD-MM-YYYY
    const formatDate = (dateStr) => {
        return format(new Date(dateStr), "dd-MM-yyyy");
    };

    // Calculate date range based on time range
    const calculateDateRange = (range) => {
        const to = new Date();
        const from = subDays(to, timeRanges[range]);

        setToDate(format(to, 'yyyy-MM-dd'));
        setFromDate(format(from, 'yyyy-MM-dd'));
    };





    // Socket listener for historical data
    useEffect(() => {
        const handleHistoricalUpdate = (payload) => {
            console.log(payload, "historical payload");
            if (payload.type === 'initial' || payload.type === 'update') {
                if (payload.dataType === 'historical') {
                    console.log('📅 Historical data received:', payload.data);

                    if (activeSubTab === 'trade') {
                        setTradeData(payload.data || []);
                    } else if (activeSubTab === 'bulkBlock') {
                        setBulkBlockData(payload.data || []);
                    } else if (activeSubTab === 'periodic') {
                        if (Array.isArray(payload.data)) {
                            setPeriodicYears(payload.data);
                        } else {
                            setPeriodicData(payload.data);
                        }
                    }
                    setLoading(false);
                }
            }
        };

        stockDetailsSocket.on('stockDetailsUpdate', handleHistoricalUpdate);

        return () => {
            stockDetailsSocket.off('stockDetailsUpdate', handleHistoricalUpdate);
        };
    }, [activeSubTab]);

    // Subscribe to data when tab or parameters change
    useEffect(() => {
        if (!symbol) return;

        setLoading(true);
        const formattedFrom = formatDate(fromDate);
        const formattedTo = formatDate(toDate);

        if (activeSubTab === 'trade') {
            stockDetailsSocket.subscribeHistorical(
                symbol,
                formattedFrom,
                formattedTo,
                'EQ'
            );
        } else if (activeSubTab === 'bulkBlock') {
            stockDetailsSocket.subscribeHistorical(
                symbol,
                formattedFrom,
                formattedTo,
                'BULK_BLOCK'
            );
        } else if (activeSubTab === 'periodic') {
            // First get years if not loaded
            if (periodicYears.length === 0) {
                stockDetailsSocket.subscribeHistorical(
                    symbol,
                    null,
                    null,
                    'PERIODIC_YEARS'
                );
            } else {
                // Get periodic data based on type
                const params = {
                    symbol,
                    type: periodicType,
                };

                if (periodicType === 'yearly') {
                    params.year = selectedYear;
                } else if (periodicType === 'monthly') {
                    params.year = selectedYear;
                    params.month = selectedMonth;
                }

                stockDetailsSocket.subscribeHistorical(
                    symbol,
                    null,
                    null,
                    'PERIODIC',
                    params
                );
            }
        }
    }, [symbol, activeSubTab, fromDate, toDate, periodicType, selectedYear, selectedMonth]);

    // Update date range when time range changes
    useEffect(() => {
        calculateDateRange(timeRange);
    }, [timeRange]);

    const downloadCSV = () => {
        let csvContent = '';
        let filename = '';

        if (activeSubTab === 'trade' && tradeData.length > 0) {
            const headers = Object.keys(tradeData[0]).join(',');
            const rows = tradeData.map(row => Object.values(row).join(','));
            csvContent = [headers, ...rows].join('\n');
            filename = `${symbol}_trade_data.csv`;
        } else if (activeSubTab === 'bulkBlock' && bulkBlockData.length > 0) {
            const headers = Object.keys(bulkBlockData[0]).join(',');
            const rows = bulkBlockData.map(row => Object.values(row).join(','));
            csvContent = [headers, ...rows].join('\n');
            filename = `${symbol}_bulk_block_data.csv`;
        }

        if (csvContent) {
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    return (
        <div className="space-y-4">
            {/* Sub Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveSubTab('trade')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'trade'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white'
                        }`}
                >
                    Trade Data
                </button>
                <button
                    onClick={() => setActiveSubTab('bulkBlock')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'bulkBlock'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white'
                        }`}
                >
                    Bulk/Block Deals Data
                </button>
                <button
                    onClick={() => setActiveSubTab('periodic')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'periodic'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white'
                        }`}
                >
                    Periodic High Low Data
                </button>
            </div>

            {/* Trade Data Tab */}
            {activeSubTab === 'trade' && (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                    {/* Controls */}
                    <div className="border-b border-slate-700/50 bg-slate-800/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-semibold text-slate-300">
                                    {symbol} ({fromDate} to {toDate})
                                </div>
                                <div className="text-xs text-slate-500">Series: EQ</div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Time Range */}
                                <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    {Object.keys(timeRanges).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${timeRange === range
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>

                                {/* Date Picker */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-400">From</span>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-400">To</span>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                                        />
                                    </div>
                                </div>

                                {/* Download CSV */}
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Series</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Open</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">High</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Low</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Prev. Close</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">LTP</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Close</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">VWAP</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">52W H</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">52W L</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Volume</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Value</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">No. of Trades</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan="14" className="px-4 py-8 text-center text-slate-400">
                                            Loading data...
                                        </td>
                                    </tr>
                                ) : tradeData.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="px-4 py-8 text-center text-slate-400">
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    tradeData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-sm text-white">{row.mtimestamp}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{row.chSeries}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chOpeningPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-green-400">{row.chTradeHighPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-red-400">{row.chTradeLowPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chPreviousClsPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-white">{row.chLastTradedPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chClosingPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.vwap}</td>
                                            <td className="px-4 py-3 text-sm text-right text-green-400">{row.ch52WeekHighPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-red-400">{row.ch52WeekLowPrice}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chTotTradedQty?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chTotTradedVal?.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.chTotalTrades?.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bulk/Block Deals Tab */}
            {activeSubTab === 'bulkBlock' && (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                    {/* Controls */}
                    <div className="border-b border-slate-700/50 bg-slate-800/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-300">
                                {symbol} ({fromDate} to {toDate})
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Time Range */}
                                <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    {Object.keys(timeRanges).map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${timeRange === range
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>

                                {/* Download CSV */}
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Client Name</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">Buy/Sell</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Quantity Traded</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Trade Price (WATP)</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                            Loading data...
                                        </td>
                                    </tr>
                                ) : bulkBlockData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                            No Records
                                        </td>
                                    </tr>
                                ) : (
                                    bulkBlockData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${row.type === 'BULK' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {row.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{row.bdDtDate}</td>
                                            <td className="px-4 py-3 text-sm text-white">{row.bdClientName}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${row.bdBuySell === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {row.bdBuySell}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">{row.bdQtyTrd?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-white">{row.bdTpWatp}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{row.bdRemarks || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Note */}
                    <div className="border-t border-slate-700/30 bg-slate-800/20 px-4 py-2">
                        <p className="text-xs text-slate-500 italic">
                            Note: To read all the information, please Click Here
                        </p>
                    </div>
                </div>
            )}

            {/* Periodic High Low Data Tab */}
            {activeSubTab === 'periodic' && (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                    {/* Controls */}
                    <div className="border-b border-slate-700/50 bg-slate-800/30 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-300">
                                Date for {periodicType === 'weekly52' ? '52 week period' : periodicType} period
                                {periodicData && ` ${periodicData.from} to ${periodicData.to}`}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Period Type */}
                                <select
                                    value={periodicType}
                                    onChange={(e) => setPeriodicType(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                >
                                    <option value="weekly52">52 Week</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="monthly">Monthly</option>
                                </select>

                                {/* Year Selector */}
                                {(periodicType === 'yearly' || periodicType === 'monthly') && (
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                    >
                                        {periodicYears.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Month Selector */}
                                {periodicType === 'monthly' && (
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                    >
                                        {months.map((month) => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Display */}
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading data...</div>
                    ) : periodicData ? (
                        <div className="p-6 grid grid-cols-3 gap-6">
                            {/* 52 Week Period */}
                            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                                <h3 className="text-lg font-semibold text-slate-300 mb-4">
                                    Date for {periodicType === 'weekly52' ? '52 week period' : periodicType} period
                                </h3>
                                <div className="text-sm text-slate-400 mb-4">
                                    {periodicData.from} to {periodicData.to}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center border-b border-slate-700/30 pb-2">
                                        <span className="text-slate-400">Particulars</span>
                                        <div className="flex gap-16">
                                            <span className="text-slate-400">Price</span>
                                            <span className="text-slate-400">Date</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Open</span>
                                        <div className="flex gap-16">
                                            <span className="text-white font-semibold">{periodicData.open.open_price}</span>
                                            <span className="text-slate-400">{periodicData.open.open_price_date}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">High</span>
                                        <div className="flex gap-16">
                                            <span className="text-green-400 font-semibold">{periodicData.high.high_price}</span>
                                            <span className="text-slate-400">{periodicData.high.high_price_date}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Low</span>
                                        <div className="flex gap-16">
                                            <span className="text-red-400 font-semibold">{periodicData.low.low_price}</span>
                                            <span className="text-slate-400">{periodicData.low.low_price_date}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Close</span>
                                        <div className="flex gap-16">
                                            <span className="text-white font-semibold">{periodicData.close.close_price}</span>
                                            <span className="text-slate-400">{periodicData.close.close_price_date}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-700/30">
                                        <span className="text-slate-300">Traded Volume (Lakhs)</span>
                                        <span className="text-white font-semibold">{periodicData.traded_volume_in_lakh}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Traded Value (Lakhs)</span>
                                        <span className="text-white font-semibold">{periodicData.traded_value_Lakhs}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Yearly and Monthly cards would be similar structure */}
                            {periodicType !== 'weekly52' && (
                                <>
                                    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                                        <h3 className="text-lg font-semibold text-slate-300 mb-4">
                                            Yearly Date for period
                                        </h3>
                                        {/* Same structure as above */}
                                    </div>

                                    {periodicType === 'monthly' && (
                                        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                                            <h3 className="text-lg font-semibold text-slate-300 mb-4">
                                                Monthly Date for period
                                            </h3>
                                            {/* Same structure as above */}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400">No data available</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default HistoricalData;