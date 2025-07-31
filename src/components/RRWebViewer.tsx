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

    const loadEvents = async () => {
        try {
            const request = indexedDB.open('rrweb', 1);

            request.onupgradeneeded = function (e) {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('events')) {
                    db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = function (e) {
                const db = (e.target as IDBOpenDBRequest).result;

                // Check if the object store exists before creating transaction
                if (!db.objectStoreNames.contains('events')) {
                    setEvents([]);
                    setEventCount(0);
                    return;
                }

                const tx = db.transaction('events', 'readonly');
                const store = tx.objectStore('events');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = function () {
                    const allEvents = getAllRequest.result;
                    setEvents(allEvents);
                    setEventCount(allEvents.length);
                };
            };
        } catch (error) {
            console.error('Error loading events:', error);
        }
    };

    const clearEvents = async () => {
        try {
            const request = indexedDB.open('rrweb', 1);

            request.onupgradeneeded = function (e) {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('events')) {
                    db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = function (e) {
                const db = (e.target as IDBOpenDBRequest).result;

                // Check if the object store exists before creating transaction
                if (!db.objectStoreNames.contains('events')) {
                    setEvents([]);
                    setEventCount(0);
                    return;
                }

                const tx = db.transaction('events', 'readwrite');
                const store = tx.objectStore('events');
                store.clear();

                setEvents([]);
                setEventCount(0);
            };
        } catch (error) {
            console.error('Error clearing events:', error);
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

        // Refresh event count every 5 seconds
        const interval = setInterval(loadEvents, 5000);

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
                <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-800">Recording Events</h3>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-600">
                            Total events: <span className="font-medium">{eventCount}</span>
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={loadEvents}
                                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={exportEvents}
                                className="text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                                disabled={eventCount === 0}
                            >
                                Export
                            </button>
                            <button
                                onClick={clearEvents}
                                className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
                                disabled={eventCount === 0}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                        {events.slice(-10).reverse().map((event, index) => (
                            <div key={event.id || index} className="text-xs bg-gray-50 p-2 mb-1 rounded">
                                <div className="font-mono text-gray-600">
                                    Type: {event.data?.type || 'unknown'}
                                </div>
                                <div className="text-gray-500">
                                    {new Date(event.timestamp).toLocaleTimeString()}
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
            )}
        </div>
    );
}