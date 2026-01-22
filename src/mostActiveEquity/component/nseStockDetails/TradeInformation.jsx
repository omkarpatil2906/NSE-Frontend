// components/TradeInformation.jsx
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { TrendingUp, Calendar, BarChart3, Activity, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { format } from 'date-fns';

function TradeInformation({ chartData, stockInfo, timeRange, onTimeRangeChange }) {
    const [chartType, setChartType] = useState('area');
    const [zoomDomain, setZoomDomain] = useState(null);
    const [brushIndexes, setBrushIndexes] = useState({ startIndex: 0, endIndex: 100 });
    const chartContainerRef = useRef(null);

    console.log(chartData, "trade info");
    

    // Process chart data from props (socket data)
    const processedChartData = useMemo(() => {
        if (!chartData || !chartData.graphData || chartData.graphData.length === 0) {
            return [];
        }

        const mappedData = chartData.graphData
            .map(([timestamp, price, status]) => {
                const date = new Date(timestamp);
                // Subtract 5.5 hours (IST offset) to get market time
                const marketTime = new Date(date.getTime() - (5.5 * 60 * 60 * 1000));

                return {
                    timestamp,
                    date: timeRange === '1D'
                        ? format(marketTime, 'HH:mm')
                        : format(marketTime, 'dd MMM'),
                    fullDate: format(marketTime, 'dd MMM yyyy HH:mm'),
                    price: parseFloat(price),
                    status
                };
            });
        
        return timeRange === '1D' ? mappedData : mappedData.reverse();
    }, [chartData, timeRange]);

    console.log("Process", processedChartData);
    

    // Update brush indexes when chart data changes
    useEffect(() => {
        if (processedChartData.length > 0) {
            setBrushIndexes({ startIndex: 0, endIndex: processedChartData.length - 1 });
            setZoomDomain(null); // Reset zoom
        }
    }, [processedChartData.length, timeRange]);

    // Wheel zoom handler
    useEffect(() => {
        if (!processedChartData || processedChartData.length === 0) return;

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
                    const newEnd = Math.min(processedChartData.length - 1, newStart + newRange);

                    setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
                    setZoomDomain([newStart, newEnd]);
                } else {
                    // Scroll down - Zoom Out
                    const newRange = Math.min(Math.floor(range * 1.15), processedChartData.length);
                    const center = Math.floor((currentStartIndex + currentEndIndex) / 2);
                    const newStart = Math.max(0, center - Math.floor(newRange / 2));
                    const newEnd = Math.min(processedChartData.length - 1, newStart + newRange);

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
    }, [brushIndexes, processedChartData]);


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
        const newEnd = Math.min(processedChartData.length - 1, newStart + newRange);

        setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
        setZoomDomain([newStart, newEnd]);
    };

    const handleZoomOut = () => {
        const { startIndex, endIndex } = brushIndexes;
        const range = endIndex - startIndex;
        const newRange = Math.min(Math.floor(range * 1.43), processedChartData.length);
        const center = Math.floor((startIndex + endIndex) / 2);
        const newStart = Math.max(0, center - Math.floor(newRange / 2));
        const newEnd = Math.min(processedChartData.length - 1, newStart + newRange);

        setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
        setZoomDomain([newStart, newEnd]);
    };

    const handleResetZoom = () => {
        if (processedChartData.length > 0) {
            setBrushIndexes({ startIndex: 0, endIndex: processedChartData.length - 1 });
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

    return (
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
                                    disabled={processedChartData.length === 0}
                                    className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    disabled={processedChartData.length === 0}
                                    className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleResetZoom}
                                    disabled={processedChartData.length === 0}
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
                                        onClick={() => onTimeRangeChange(range)}
                                        className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
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
                                    className={`relative p-1.5 rounded-md transition-all duration-300 ${
                                        chartType === 'area' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
                                    className={`relative p-1.5 rounded-md transition-all duration-300 ${
                                        chartType === 'line' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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

                    

                    {processedChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400 font-semibold">Loading chart data...</p>
                                <p className="text-slate-500 text-sm mt-2">Waiting for socket connection</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={400}>
                            {chartType === 'area' ? (
                                <AreaChart data={processedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                                <LineChart data={processedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
    );
}

export default TradeInformation;