import React from "react";

const OrderBook = ({ orderBook }) => {
  if (!orderBook) {
    return (
      <div className="text-slate-400 text-sm text-center mt-10">
        Order book not available
      </div>
    );
  }

  const bids = [1, 2, 3, 4, 5].map(i => ({
    qty: orderBook[`buyQuantity${i}`],
    price: orderBook[`buyPrice${i}`]
  }));

  const asks = [1, 2, 3, 4, 5].map(i => ({
    price: orderBook[`sellPrice${i}`],
    qty: orderBook[`sellQuantity${i}`]
  }));

  return (
    <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl overflow-hidden text-sm">
      
      {/* Header */}
      <div className="grid grid-cols-4 bg-indigo-900 text-white font-semibold px-2 py-2">
        <div className="text-center">Qty</div>
        <div className="text-center">Bid (₹)</div>
        <div className="text-center">Ask (₹)</div>
        <div className="text-center">Qty</div>
      </div>

      {/* Rows */}
      {bids.map((bid, i) => (
        <div
          key={i}
          className="grid grid-cols-4 border-b border-slate-700/40"
        >
          <div className="text-center py-1 bg-emerald-950/40">
            {bid.qty}
          </div>
          <div className="text-center py-1 text-green-400 bg-emerald-950/40">
            {bid.price?.toFixed(2)}
          </div>
          <div className="text-center py-1 text-red-400 bg-red-950/40">
            {asks[i].price?.toFixed(2)}
          </div>
          <div className="text-center py-1 bg-red-950/40">
            {asks[i].qty}
          </div>
        </div>
      ))}

      {/* Buy / Sell Bar */}
      <div className="px-3 py-3">
        <div className="flex h-2 rounded overflow-hidden">
          <div
            className="bg-green-600"
            style={{ width: `${orderBook.perBuyQty}%` }}
          />
          <div
            className="bg-red-600"
            style={{ width: `${orderBook.perSellQty}%` }}
          />
        </div>

        <div className="flex justify-between text-xs mt-2">
          <span className="text-green-400">
            {orderBook.perBuyQty.toFixed(2)}% Buy
          </span>
          <span className="text-red-400">
            {orderBook.perSellQty.toFixed(2)}% Sell
          </span>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 text-center py-2 border-t border-slate-700/40 font-semibold">
        <div className="text-green-400">
          {orderBook.totalBuyQuantity.toLocaleString()}
        </div>
        <div className="text-slate-400">Total Qty</div>
        <div className="text-red-400">
          {orderBook.totalSellQuantity.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
