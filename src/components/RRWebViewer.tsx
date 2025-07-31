'use client';

import { useState, useEffect } from 'react';

interface StoredEvent {
    id: number;
    data: any;
    timestamp: number;
    sessionId: string;
}

export default function RRWebViewer() {
    const [events, setEvents] = useState<StoredEvent[]>([]);
    const [eventCount, setEventCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [sessions, setSessions] = useState<string[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [isDbReady, setIsDbReady] = useState(false);

    const loadEvents = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager && dbManager.getDebugInfo().isReady) {
                const allEvents = await dbManager.getAllEvents();
                setEvents(allEvents);
                setEventCount(allEvents.length);
            } else {
                // Database not ready, clear events but don't error
                setEvents([]);
                setEventCount(0);
            }
        } catch (error) {
            // Only log errors that aren't "Database not ready"
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('Database not ready')) {
                console.error('Error loading events:', error);
            }
            setEvents([]);
            setEventCount(0);
        }
    };

    const clearEvents = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager) {
                await dbManager.clearDatabase();
                setEvents([]);
                setEventCount(0);
                setSessions([]);
                setSelectedSession('');
            }
        } catch (error) {
            console.error('Error clearing events:', error);
        }
    };

    const loadSessions = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager && dbManager.getDebugInfo().isReady) {
                const sessionList = await dbManager.getAllSessions();
                setSessions(sessionList);
                if (sessionList.length > 0 && !selectedSession) {
                    setSelectedSession(sessionList[0]);
                }
            } else {
                // Database not ready, clear sessions but don't error
                setSessions([]);
                setSelectedSession('');
            }
        } catch (error) {
            // Only log errors that aren't "Database not ready"
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('Database not ready')) {
                console.error('Error loading sessions:', error);
            }
            setSessions([]);
            setSelectedSession('');
        }
    };

    const exportCurrentSession = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager && dbManager.getDebugInfo().isReady) {
                // Get current session from sessionStorage
                const currentSessionId = sessionStorage.getItem('rrweb-session-id');
                if (currentSessionId) {
                    await dbManager.exportSession(currentSessionId);
                } else {
                    alert('No current session found');
                }
            } else {
                alert('Database not ready. Please wait for database to initialize.');
            }
        } catch (error) {
            console.error('Error exporting current session:', error);
            alert('Failed to export current session');
        }
    };

    const exportSelectedSession = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager && dbManager.getDebugInfo().isReady && selectedSession) {
                await dbManager.exportSession(selectedSession);
            } else if (!dbManager?.getDebugInfo().isReady) {
                alert('Database not ready. Please wait for database to initialize.');
            } else {
                alert('No session selected');
            }
        } catch (error) {
            console.error('Error exporting selected session:', error);
            alert('Failed to export selected session');
        }
    };

    const exportAllSessions = async () => {
        try {
            const dbManager = (window as any).rrwebDBManager;
            if (dbManager && dbManager.getDebugInfo().isReady) {
                await dbManager.exportAllSessions();
            } else {
                alert('Database not ready. Please wait for database to initialize.');
            }
        } catch (error) {
            console.error('Error exporting all sessions:', error);
            alert('Failed to export all sessions');
        }
    };

    const exportEvents = () => {
        const dataStr = JSON.stringify(events, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `rrweb-events-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    useEffect(() => {
        loadEvents();
        loadSessions();

        // Refresh event count and sessions every 5 seconds
        const interval = setInterval(() => {
            // Update database ready status
            const dbManager = (window as any).rrwebDBManager;
            const isReady = dbManager?.getDebugInfo().isReady || false;
            setIsDbReady(isReady);

            loadEvents();
            loadSessions();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
            >
                📹 RRWeb ({eventCount} events)
            </button>

            {isVisible && (
                <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-96 max-h-[600px] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-800">RRWeb Session Manager</h3>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Session Statistics */}
                    <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Database: <span className={`font-medium ${isDbReady ? 'text-green-600' : 'text-red-600'}`}>
                                    {isDbReady ? 'Ready' : 'Not Ready'}
                                </span>
                            </p>
                            {!isDbReady && (
                                <span className="text-xs text-amber-600">Initializing...</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600">
                            Total events: <span className="font-medium">{eventCount}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Sessions: <span className="font-medium">{sessions.length}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                            Current session: {(() => {
                                const currentSession = sessionStorage.getItem('rrweb-session-id');
                                if (!currentSession) return 'None';
                                return currentSession.length > 20 ? `${currentSession.substring(0, 20)}...` : currentSession;
                            })()}
                        </p>
                    </div>

                    {/* Export Section */}
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Export Options</h4>
                        <div className="space-y-2">
                            <div className="flex space-x-2">
                                <button
                                    onClick={exportCurrentSession}
                                    className={`text-xs px-3 py-1 rounded transition-colors flex-1 ${!isDbReady || eventCount === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-100 hover:bg-blue-200'
                                        }`}
                                    disabled={!isDbReady || eventCount === 0}
                                >
                                    Export Current Session
                                </button>
                                <button
                                    onClick={exportAllSessions}
                                    className={`text-xs px-3 py-1 rounded transition-colors flex-1 ${!isDbReady || eventCount === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-100 hover:bg-green-200'
                                        }`}
                                    disabled={!isDbReady || eventCount === 0}
                                >
                                    Export All Sessions
                                </button>
                            </div>

                            {sessions.length > 0 && (
                                <div className="flex space-x-2 items-center">
                                    <select
                                        value={selectedSession}
                                        onChange={(e) => setSelectedSession(e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                                    >
                                        {sessions.map((sessionId, index) => {
                                            const sessionIdStr = String(sessionId);
                                            return (
                                                <option key={sessionIdStr + index} value={sessionIdStr}>
                                                    {sessionIdStr.length > 30 ? `${sessionIdStr.substring(0, 30)}...` : sessionIdStr}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <button
                                        onClick={exportSelectedSession}
                                        className={`text-xs px-3 py-1 rounded transition-colors ${!isDbReady || !selectedSession
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-purple-100 hover:bg-purple-200'
                                            }`}
                                        disabled={!isDbReady || !selectedSession}
                                    >
                                        Export
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Management Actions */}
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Management</h4>
                        <div className="flex space-x-2">
                            <button
                                onClick={loadEvents}
                                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={exportEvents}
                                className="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded transition-colors"
                                disabled={eventCount === 0}
                                title="Export raw events (for debugging)"
                            >
                                Export Raw
                            </button>
                            <button
                                onClick={clearEvents}
                                className={`text-xs px-2 py-1 rounded transition-colors ${!isDbReady || eventCount === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-100 hover:bg-red-200'
                                    }`}
                                disabled={!isDbReady || eventCount === 0}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Recent Events */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Events</h4>
                        <div className="max-h-48 overflow-y-auto">
                            {events.slice(-10).reverse().map((event, index) => (
                                <div key={event.id || index} className="text-xs bg-gray-50 p-2 mb-1 rounded">
                                    <div className="font-mono text-gray-600">
                                        Type: {event.data?.type || 'unknown'}
                                    </div>
                                    <div className="text-gray-500">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                        Session: {(() => {
                                            const sessionId = String(event.sessionId || 'unknown');
                                            return sessionId.length > 15 ? `${sessionId.substring(0, 15)}...` : sessionId;
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {eventCount === 0 && (
                            <p className="text-sm text-gray-500 italic text-center">
                                No events recorded yet
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}