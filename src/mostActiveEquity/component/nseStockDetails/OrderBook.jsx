import React from "react";
import { Activity } from "lucide-react";

const OrderBook = ({ orderBook }) => {
  if (!orderBook) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Order Book Not Available</p>
        </div>
      </div>
    );
  }

  const bids = [1, 2, 3, 4, 5].map(i => ({
    qty: orderBook[`buyQuantity${i}`] || 0,
    price: orderBook[`buyPrice${i}`] || 0
  }));

  const asks = [1, 2, 3, 4, 5].map(i => ({
    price: orderBook[`sellPrice${i}`] || 0,
    qty: orderBook[`sellQuantity${i}`] || 0
  }));

  const maxBidQty = Math.max(...bids.map(b => b.qty));
  const maxAskQty = Math.max(...asks.map(a => a.qty));

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden shadow-xl h-full flex flex-col">
      
      {/* Header */}
      <div className="border-b border-slate-700/50 px-4 py-3.5 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">Order Book</h3>
          <span className="text-xs text-slate-500 font-medium">Market Depth</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b border-slate-700/30 bg-slate-800/20">
        <div className="grid grid-cols-4 gap-px">
          <div className="px-3 py-2 text-center">
            <span className="text-xs font-medium text-slate-400">Bid</span>
          </div>
          <div className="px-3 py-2 text-center">
            <span className="text-xs font-medium text-slate-400">Qty</span>
          </div>
          <div className="px-3 py-2 text-center">
            <span className="text-xs font-medium text-slate-400">Ask</span>
          </div>
          <div className="px-3 py-2 text-center">
            <span className="text-xs font-medium text-slate-400">Qty</span>
          </div>
        </div>
      </div>

      {/* Order Rows */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {bids.map((bid, i) => {
          const bidWidthPercent = maxBidQty > 0 ? (bid.qty / maxBidQty) * 100 : 0;
          const askWidthPercent = maxAskQty > 0 ? (asks[i].qty / maxAskQty) * 100 : 0;

          return (
            <div 
              key={i} 
              className="grid grid-cols-4 gap-px border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors"
            >
              {/* BID Price */}
              <div className="relative px-3 py-2.5 overflow-hidden">
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10"
                  style={{ width: `${bidWidthPercent}%` }}
                />
                <span className="relative text-sm font-medium text-emerald-400">
                  ₹{bid.price.toFixed(2)}
                </span>
              </div>

              {/* BID Quantity */}
              <div className="px-3 py-2.5 text-center">
                <span className="text-sm text-slate-300">
                  {bid.qty.toLocaleString()}
                </span>
              </div>

              {/* ASK Price */}
              <div className="relative px-3 py-2.5 overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-red-500/10"
                  style={{ width: `${askWidthPercent}%` }}
                />
                <span className="relative text-sm font-medium text-red-400">
                  ₹{asks[i].price.toFixed(2)}
                </span>
              </div>

              {/* ASK Quantity */}
              <div className="px-3 py-2.5 text-center">
                <span className="text-sm text-slate-300">
                  {asks[i].qty.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 px-4 py-3">
        {/* Distribution Bar */}
        <div className="mb-3">
          <div className="flex h-2 rounded-sm overflow-hidden bg-slate-800">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${orderBook.perBuyQty || 0}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-300"
              style={{ width: `${orderBook.perSellQty || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-emerald-400 font-medium">
              {(orderBook.perBuyQty || 0).toFixed(1)}%
            </span>
            <span className="text-red-400 font-medium">
              {(orderBook.perSellQty || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Total Quantities */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-1">Total Bid</p>
            <p className="text-emerald-400 font-semibold">
              {(orderBook.totalBuyQuantity || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Spread</p>
            <p className="text-slate-300 font-semibold">
              ₹{(asks[0].price - bids[0].price).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Total Ask</p>
            <p className="text-red-400 font-semibold">
              {(orderBook.totalSellQuantity || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>
    </div>
  );
};

export default OrderBook;