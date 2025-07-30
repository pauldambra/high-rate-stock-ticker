'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stock, Exchange, ExchangePrices, ExchangeStockPrice, StockTickerState, StockTickerProps } from '@/types/stock';
import {
    generateInitialStocks,
    generateInitialExchangePrices,
    mutateExchangeStockPrice,
    EXCHANGES
} from '@/lib/stockData';

export default function StockTicker({ mutationRate = 80 }: StockTickerProps) {
    const [state, setState] = useState<StockTickerState>(() => {
        const initialStocks = generateInitialStocks();
        const exchanges = EXCHANGES;
        return {
            stocks: initialStocks,
            exchanges,
            exchangePrices: generateInitialExchangePrices(initialStocks, exchanges),
            currentDayOffset: 0
        };
    });

    // Dynamic mutation engine based on configurable mutation rate
    useEffect(() => {
        const intervals: NodeJS.Timeout[] = [];

        // Calculate intervals based on desired mutation rate
        // We'll distribute the mutations across multiple intervals for smoother animation
        const numberOfIntervals = Math.min(8, Math.max(1, Math.floor(mutationRate / 10)));
        const baseInterval = Math.max(10, Math.floor(1000 / mutationRate * numberOfIntervals));

        // Create multiple mutation intervals for smooth visual activity
        for (let i = 0; i < numberOfIntervals; i++) {
            const interval = setInterval(() => {
                setState(prevState => {
                    const newExchangePrices = { ...prevState.exchangePrices };

                    // Randomly select exchange and stock to mutate
                    const randomExchange = prevState.exchanges[Math.floor(Math.random() * prevState.exchanges.length)];
                    const randomStock = prevState.stocks[Math.floor(Math.random() * prevState.stocks.length)];

                    if (newExchangePrices[randomExchange.code] && newExchangePrices[randomExchange.code][randomStock.symbol]) {
                        newExchangePrices[randomExchange.code] = {
                            ...newExchangePrices[randomExchange.code]
                        };
                        newExchangePrices[randomExchange.code][randomStock.symbol] = mutateExchangeStockPrice(
                            newExchangePrices[randomExchange.code][randomStock.symbol]
                        );
                    }

                    return {
                        ...prevState,
                        exchangePrices: newExchangePrices
                    };
                });
            }, baseInterval + i * 10); // Stagger intervals by 10ms each

            intervals.push(interval);
        }

        return () => {
            intervals.forEach(clearInterval);
        };
    }, [mutationRate]);

    // Additional burst mutation for higher mutation rates
    useEffect(() => {
        if (mutationRate < 50) {
            return; // Skip burst mutations for lower rates
        }

        const burstInterval = setInterval(() => {
            setState(prevState => {
                const newExchangePrices = { ...prevState.exchangePrices };

                // Mutate multiple cells in a burst (scale with mutation rate)
                const burstCount = Math.max(1, Math.floor(mutationRate / 30));
                for (let i = 0; i < burstCount; i++) {
                    const randomExchange = prevState.exchanges[Math.floor(Math.random() * prevState.exchanges.length)];
                    const randomStock = prevState.stocks[Math.floor(Math.random() * prevState.stocks.length)];

                    if (newExchangePrices[randomExchange.code] && newExchangePrices[randomExchange.code][randomStock.symbol]) {
                        newExchangePrices[randomExchange.code] = {
                            ...newExchangePrices[randomExchange.code]
                        };
                        newExchangePrices[randomExchange.code][randomStock.symbol] = mutateExchangeStockPrice(
                            newExchangePrices[randomExchange.code][randomStock.symbol]
                        );
                    }
                }

                return {
                    ...prevState,
                    exchangePrices: newExchangePrices
                };
            });
        }, Math.max(50, 200 - mutationRate)); // Faster bursts for higher mutation rates

        return () => clearInterval(burstInterval);
    }, [mutationRate]);

    const formatPrice = (price: number) => {
        return `$${price.toFixed(2)}`;
    };

    const formatChange = (change: number, changePercent: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
    };

    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-600 bg-green-50 border-green-200';
        if (change < 0) return 'text-red-600 bg-red-50 border-red-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getCellBackground = (lastUpdated: number) => {
        const timeSinceUpdate = Date.now() - lastUpdated;
        if (timeSinceUpdate < 500) {
            return 'bg-yellow-50 border-yellow-200'; // Recently updated
        }
        return 'bg-white';
    };

    return (
        <div className="p-4 max-w-full overflow-x-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        Global Stock Exchange Dashboard
                    </CardTitle>
                    <div className="text-center text-sm text-gray-500">
                        Live updates • High-frequency mutations • {state.stocks.length} stocks × {state.exchanges.length} exchanges
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            {/* Header row with stock symbols */}
                            <div
                                className="grid gap-1 mb-2 p-2 bg-gray-50 rounded-lg"
                                style={{ gridTemplateColumns: `200px repeat(${state.stocks.length}, minmax(120px, 1fr))` }}
                            >
                                <div className="font-semibold text-gray-700">Exchange</div>
                                {state.stocks.map((stock) => (
                                    <div key={stock.symbol} className="font-semibold text-center text-blue-600">
                                        <div className="text-sm font-bold">{stock.symbol}</div>
                                        <div className="text-xs text-gray-500 truncate">{stock.name}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Exchange rows */}
                            {state.exchanges.map((exchange) => (
                                <div
                                    key={exchange.code}
                                    className="grid gap-1 mb-1 p-1 border-b border-gray-100 hover:bg-gray-25 transition-colors"
                                    style={{ gridTemplateColumns: `200px repeat(${state.stocks.length}, minmax(120px, 1fr))` }}
                                >
                                    {/* Exchange info */}
                                    <div className="p-2 bg-gray-50 rounded flex flex-col justify-center">
                                        <div className="font-bold text-purple-600">{exchange.code}</div>
                                        <div className="text-xs text-gray-600 truncate">{exchange.name}</div>
                                        <div className="text-xs text-gray-500">{exchange.country}</div>
                                    </div>

                                    {/* Stock prices for this exchange */}
                                    {state.stocks.map((stock) => {
                                        const stockPrice = state.exchangePrices[exchange.code]?.[stock.symbol];
                                        if (!stockPrice) return <div key={stock.symbol} className="p-2"></div>;

                                        return (
                                            <div
                                                key={stock.symbol}
                                                className={`p-2 border rounded transition-all duration-200 ${getCellBackground(stockPrice.lastUpdated)}`}
                                            >
                                                <div className="text-center">
                                                    <div className="font-mono font-semibold text-sm">
                                                        {formatPrice(stockPrice.price)}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs mt-1 ${getChangeColor(stockPrice.change)}`}
                                                    >
                                                        {formatChange(stockPrice.change, stockPrice.changePercent)}
                                                    </Badge>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Vol: {(stockPrice.volume / 1000).toFixed(0)}K
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
                        <div>Total cells: {state.stocks.length * state.exchanges.length} • All cells updating in real-time</div>
                        <div>Mutation rate: ~{mutationRate} updates per second across all exchanges</div>
                        <div className="text-blue-600">
                            💡 Control mutation rate via URL: ?mutationRate={mutationRate} (1-1000)
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 