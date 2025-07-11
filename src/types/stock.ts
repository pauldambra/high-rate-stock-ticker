export interface Stock {
    symbol: string;
    name: string;
}

export interface ExchangeStockPrice {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    lastUpdated: number;
}

export interface Exchange {
    code: string;
    name: string;
    country: string;
    timezone: string;
}

export interface ExchangePrices {
    [exchangeCode: string]: {
        [stockSymbol: string]: ExchangeStockPrice;
    };
}

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface StockTickerState {
    stocks: Stock[];
    exchanges: Exchange[];
    exchangePrices: ExchangePrices;
    currentDayOffset: number;
} 