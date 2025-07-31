import { Stock, Exchange, ExchangePrices, ExchangeStockPrice, DayOfWeek } from '@/types/stock';

export const DAYS_OF_WEEK: DayOfWeek[] = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const STOCK_SYMBOLS = [
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'UBER', 'SPOT', 'TWTR', 'SNAP', 'ZOOM', 'SHOP', 'SQ', 'PYPL',
    'ROKU', 'PINS', 'DDOG', 'SNOW', 'PLTR', 'RBLX', 'COIN', 'HOOD'
];

export const COMPANY_NAMES: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corp.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corp.',
    'NFLX': 'Netflix Inc.',
    'UBER': 'Uber Technologies',
    'SPOT': 'Spotify Technology',
    'TWTR': 'Twitter Inc.',
    'SNAP': 'Snap Inc.',
    'ZOOM': 'Zoom Video Communications',
    'SHOP': 'Shopify Inc.',
    'SQ': 'Block Inc.',
    'PYPL': 'PayPal Holdings',
    'ROKU': 'Roku Inc.',
    'PINS': 'Pinterest Inc.',
    'DDOG': 'Datadog Inc.',
    'SNOW': 'Snowflake Inc.',
    'PLTR': 'Palantir Technologies',
    'RBLX': 'Roblox Corp.',
    'COIN': 'Coinbase Global',
    'HOOD': 'Robinhood Markets'
};

export const EXCHANGES: Exchange[] = [
    { code: 'NYSE', name: 'New York Stock Exchange', country: 'USA', timezone: 'EST' },
    { code: 'NASDAQ', name: 'NASDAQ', country: 'USA', timezone: 'EST' },
    { code: 'LSE', name: 'London Stock Exchange', country: 'UK', timezone: 'GMT' },
    { code: 'TSE', name: 'Tokyo Stock Exchange', country: 'Japan', timezone: 'JST' },
    { code: 'HKEX', name: 'Hong Kong Exchange', country: 'Hong Kong', timezone: 'HKT' },
    { code: 'SSE', name: 'Shanghai Stock Exchange', country: 'China', timezone: 'CST' },
    { code: 'BSE', name: 'Bombay Stock Exchange', country: 'India', timezone: 'IST' },
    { code: 'TSX', name: 'Toronto Stock Exchange', country: 'Canada', timezone: 'EST' },
    { code: 'ASX', name: 'Australian Securities Exchange', country: 'Australia', timezone: 'AEST' },
    { code: 'FWB', name: 'Frankfurt Stock Exchange', country: 'Germany', timezone: 'CET' }
];

export function generateInitialStocks(count?: number): Stock[] {
    const symbols = count ? STOCK_SYMBOLS.slice(0, count) : STOCK_SYMBOLS;
    return symbols.map(symbol => ({
        symbol,
        name: COMPANY_NAMES[symbol] || `${symbol} Corp.`
    }));
}

export function generateInitialExchangePrices(stocks: Stock[], exchanges: Exchange[]): ExchangePrices {
    const exchangePrices: ExchangePrices = {};

    exchanges.forEach(exchange => {
        exchangePrices[exchange.code] = {};

        stocks.forEach(stock => {
            const basePrice = Math.random() * 500 + 50; // $50-$550
            const exchangeMultiplier = 0.8 + Math.random() * 0.4; // 0.8-1.2x variation between exchanges
            const price = basePrice * exchangeMultiplier;
            const change = (Math.random() - 0.5) * 20; // -$10 to +$10
            const changePercent = (change / price) * 100;
            const volume = Math.floor(Math.random() * 10000000) + 100000; // 100K to 10M

            exchangePrices[exchange.code][stock.symbol] = {
                price: Math.max(price + change, 1),
                change,
                changePercent,
                volume,
                lastUpdated: Date.now()
            };
        });
    });

    return exchangePrices;
}

export function generateInitialExchangePricesIncremental(stocks: Stock[], exchanges: Exchange[]): ExchangePrices {
    const exchangePrices: ExchangePrices = {};

    exchanges.forEach(exchange => {
        exchangePrices[exchange.code] = {};

        stocks.forEach(stock => {
            exchangePrices[exchange.code][stock.symbol] = {
                price: 0,
                change: 0,
                changePercent: 0,
                volume: 0,
                lastUpdated: Date.now()
            };
        });
    });

    return exchangePrices;
}

export function mutateExchangeStockPrice(stockPrice: ExchangeStockPrice): ExchangeStockPrice {
    const volatility = 0.015; // 1.5% max change per mutation (slightly lower for more frequent mutations)
    const changePercent = (Math.random() - 0.5) * volatility * 2;
    const priceChange = stockPrice.price * changePercent;
    const newPrice = Math.max(stockPrice.price + priceChange, 0.01);

    // Calculate new change from some baseline (we'll use a moving average concept)
    const baselinePrice = stockPrice.price - stockPrice.change;
    const totalChange = newPrice - baselinePrice;
    const totalChangePercent = (totalChange / baselinePrice) * 100;

    return {
        price: newPrice,
        change: totalChange,
        changePercent: totalChangePercent,
        volume: stockPrice.volume + Math.floor(Math.random() * 1000),
        lastUpdated: Date.now()
    };
}

export function incrementExchangeStockPrice(stockPrice: ExchangeStockPrice): ExchangeStockPrice {
    const newPrice = stockPrice.price + 1;
    const priceChange = 1;

    // Calculate change percentage (avoid division by zero for initial 0 price)
    const previousPrice = stockPrice.price === 0 ? 1 : stockPrice.price;
    const changePercent = (priceChange / previousPrice) * 100;

    return {
        price: newPrice,
        change: stockPrice.change + priceChange,
        changePercent: changePercent,
        volume: stockPrice.volume + 1,
        lastUpdated: Date.now()
    };
}

export function getDayName(dayOffset: number): DayOfWeek {
    const today = new Date();
    const dayIndex = (today.getDay() + dayOffset) % 7;
    return DAYS_OF_WEEK[dayIndex];
} 