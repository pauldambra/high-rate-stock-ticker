# Stock Ticker with RRWeb Recording

A Next.js application featuring a dynamic stock ticker with integrated session recording capabilities using [RRWeb](https://www.rrweb.io/). This project demonstrates real-time data visualization with comprehensive user interaction recording and export functionality.

## Features

- **Dynamic Stock Ticker**: Real-time stock price updates across multiple global exchanges
- **Two Operating Modes**: Incremental (predictable) and Random (realistic) value updates
- **Session Recording**: Automatic recording of all user interactions using RRWeb
- **Session Management**: Export, view, and manage recorded sessions
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 22
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Operating Modes

### Incremental Mode (Default)

- **URL**: `http://localhost:3000`
- **Description**: All stock prices start at 0 and increment by 1 with each update
- **Use Case**: Testing and verifying recording functionality
- **Visual Indicator**: "Incremental Mode (Test)" badge

### Random Mode

- **URL**: `http://localhost:3000?mode=random`
- **Description**: Realistic stock price movements with random fluctuations
- **Use Case**: Demonstration and realistic user interaction scenarios
- **Visual Indicator**: "Random Mode" badge

## Query Parameters

| Parameter  | Values   | Default       | Description                           |
| ---------- | -------- | ------------- | ------------------------------------- |
| `mode`     | `random` | `incremental` | Sets the stock price update behavior  |
| `gridRows` | `1-10`   | `10`          | Number of exchanges (rows) to display |
| `gridCols` | `1-24`   | `24`          | Number of stocks (columns) to display |

### Examples

```
# Incremental mode with default grid (10×24)
http://localhost:3000

# Random mode
http://localhost:3000?mode=random

# Small grid for testing (3×5)
http://localhost:3000?gridRows=3&gridCols=5

# Large grid in random mode (10×24)
http://localhost:3000?mode=random&gridRows=10&gridCols=24

# Single row for performance testing
http://localhost:3000?gridRows=1&gridCols=10
```

## Session Recording & Export

This application automatically records all user interactions using RRWeb. Recorded sessions are exported as pure RRWeb event arrays that can be directly imported into any RRWeb player for pixel-perfect replay.

### Browser Console Commands

The following commands are automatically available in the browser console:

#### Session Management

```javascript
// List all available sessions with event counts
listRRWebSessions()

// Export the current session
exportRRWebSession()

// Export a specific session by ID
exportRRWebSession("session-1234567890-abc123")

// Export all sessions in one file
exportAllRRWebSessions()
```

#### Database Management

```javascript
// View database status and statistics
debugRRWebDB()

// Clear all recorded data (destructive operation)
clearRRWebDB()

// Access the database manager directly for advanced operations
rrwebDBManager.exportSession("session-id")
rrwebDBManager.getAllSessions()
```

### UI-Based Session Management

Click the floating **📹 RRWeb** button (bottom-right corner) to access:

- **Session Statistics**: View total events and session count
- **Export Options**:
  - Export Current Session
  - Export All Sessions
  - Select and export specific sessions
- **Management Tools**:
  - Refresh data
  - Export raw events (for debugging)
  - Clear all data

### Export File Format

Exported files contain pure RRWeb event arrays that can be directly used with any RRWeb player for replay.

#### Single Session Export

```json
[
  {
    "type": 4,
    "data": {
      "href": "http://localhost:3000/",
      "width": 1920,
      "height": 1080
    },
    "timestamp": 1705312200000
  },
  {
    "type": 3,
    "data": {
      "source": 2,
      "type": 0,
      "id": 1,
      "x": 100,
      "y": 200
    },
    "timestamp": 1705312201000
  }
  // ... more rrweb events
]
```

#### Multi-Session Export

When exporting all sessions, each session is saved as a separate file with the naming pattern:
- `rrweb-session-{sessionId}-{date}.json`

Each file contains the same format: a pure array of RRWeb events ready for replay.

#### Using Exported Files

To replay exported sessions, simply load the JSON file and pass the events array to any RRWeb player:

```javascript
// Load exported events
const events = await fetch('./rrweb-session-abc123-2024-01-15.json').then(r => r.json());

// Replay with rrweb player
import { Replayer } from 'rrweb';
const replayer = new Replayer(events);
replayer.play();
```

## Technical Architecture

### Stock Ticker

- **Data Generation**: Configurable stock data with multiple exchanges
- **Mutation Engine**: High-frequency updates with configurable mutation rates
- **Responsive Grid**: Dynamic layout supporting variable numbers of stocks/exchanges

### Recording System

- **RRWeb Integration**: Captures DOM mutations, clicks, scrolls, and input changes
- **IndexedDB Storage**: Client-side persistent storage with session management
- **Database Manager**: Singleton pattern preventing race conditions
- **Event Queueing**: Ensures no events are lost during database initialization

### Session Management

- **Session Isolation**: Each browser session gets a unique identifier
- **Metadata Tracking**: Event counts, timestamps, and session duration
- **Export Functionality**: Pure RRWeb event arrays for direct replay compatibility

## Use Cases

### Development & Testing

- **Recording Verification**: Use incremental mode to verify recording accuracy
- **Performance Testing**: Test different grid sizes to measure RRWeb recording performance
- **Bug Reproduction**: Export sessions showing problematic user interactions
- **Load Testing**: Use large grids (e.g., `gridRows=10&gridCols=24`) to stress test recording
- **Minimal Testing**: Use small grids (e.g., `gridRows=1&gridCols=5`) for focused debugging

### User Experience Research

- **Behavior Analysis**: Study how users interact with dynamic content
- **A/B Testing**: Record and compare user interactions across different variants
- **Usability Studies**: Export sessions for detailed analysis

### Quality Assurance

- **Automated Testing**: Export sessions as RRWeb-compatible files for automated replay testing
- **Manual Testing**: Record test scenarios for documentation and regression testing
- **Issue Tracking**: Attach session recordings to bug reports for pixel-perfect reproduction

## Browser Compatibility

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Note: IndexedDB and modern JavaScript features are required.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [RRWeb](https://www.rrweb.io/) for the session recording functionality
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
