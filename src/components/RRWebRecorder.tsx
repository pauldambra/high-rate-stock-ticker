'use client';

import { useEffect } from 'react';

declare global {
    interface Window {
        rrweb: {
            record: (options: {
                emit: (event: any) => void;
                checkoutEveryNth?: number;
                checkoutEveryNms?: number;
            }) => () => void;
        };
        // Debug helpers for IndexedDB
        debugRRWebDB?: () => void;
        clearRRWebDB?: () => void;
    }
}

interface RRWebEvent {
    type: number;
    data: any;
    timestamp: number;
    delay?: number;
}

// Singleton database manager to prevent multiple connections
class RRWebDBManager {
    private static instance: RRWebDBManager;
    private db: IDBDatabase | null = null;
    private isInitializing = false;
    private isReady = false;
    private eventQueue: RRWebEvent[] = [];
    private maxQueueSize = 1000;

    static getInstance(): RRWebDBManager {
        if (!RRWebDBManager.instance) {
            RRWebDBManager.instance = new RRWebDBManager();
        }
        return RRWebDBManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.isReady || this.isInitializing) {
            return;
        }

        this.isInitializing = true;
        console.log('Initializing RRWeb database...');

        try {
            // First, close any existing connections and delete the database to start fresh
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            // Delete existing database to ensure clean state
            await this.deleteDatabase();

            // Create new database
            this.db = await this.openDatabase();
            this.isReady = true;
            this.isInitializing = false;

            console.log('RRWeb database initialized successfully');
            console.log('Object stores:', Array.from(this.db.objectStoreNames));

            // Process queued events
            await this.processEventQueue();
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.isInitializing = false;
            this.isReady = false;
            throw error;
        }
    }

    private deleteDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Deleting existing RRWeb database...');
            const deleteRequest = indexedDB.deleteDatabase('rrweb');

            deleteRequest.onsuccess = () => {
                console.log('Database deleted successfully');
                resolve();
            };

            deleteRequest.onerror = () => {
                console.log('Database deletion failed, continuing...');
                resolve(); // Continue even if deletion fails
            };

            deleteRequest.onblocked = () => {
                console.log('Database deletion blocked, continuing...');
                resolve(); // Continue even if blocked
            };
        });
    }

    private openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            console.log('Opening new RRWeb database...');
            const request = indexedDB.open('rrweb', 1);

            request.onupgradeneeded = (e) => {
                console.log('Database upgrade needed, creating object stores...');
                const database = (e.target as IDBOpenDBRequest).result;

                // Remove any existing object stores
                const existingStores = Array.from(database.objectStoreNames);
                existingStores.forEach(storeName => {
                    console.log(`Deleting existing store: ${storeName}`);
                    database.deleteObjectStore(storeName);
                });

                // Create the events object store
                console.log('Creating events object store...');
                const store = database.createObjectStore('events', {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // Add an index for sessionId
                store.createIndex('sessionId', 'sessionId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });

                console.log('Object store created successfully');
            };

            request.onsuccess = (e) => {
                const database = (e.target as IDBOpenDBRequest).result;
                console.log('Database opened successfully');
                console.log('Available object stores:', Array.from(database.objectStoreNames));

                // Verify the events store exists
                if (!database.objectStoreNames.contains('events')) {
                    reject(new Error('Events object store was not created'));
                    return;
                }

                resolve(database);
            };

            request.onerror = (e) => {
                console.error('Database open error:', e);
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onblocked = (e) => {
                console.error('Database open blocked:', e);
                reject(new Error('Database open blocked'));
            };
        });
    }

    async saveEvent(event: RRWebEvent): Promise<void> {
        // If not ready, queue the event
        if (!this.isReady || !this.db) {
            this.eventQueue.push(event);
            if (this.eventQueue.length > this.maxQueueSize) {
                this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
            }
            return;
        }

        try {
            await this.saveEventToDatabase(event);
        } catch (error) {
            console.error('Error saving event to database:', error);
            // Queue the event for retry
            this.eventQueue.push(event);
        }
    }

    private saveEventToDatabase(event: RRWebEvent): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not available'));
                return;
            }

            try {
                const transaction = this.db.transaction(['events'], 'readwrite');
                const store = transaction.objectStore('events');

                const request = store.add({
                    data: event,
                    timestamp: Date.now(),
                    sessionId: this.getSessionId()
                });

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);

                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(new Error('Transaction aborted'));
            } catch (error) {
                reject(error);
            }
        });
    }

    private async processEventQueue(): Promise<void> {
        if (this.eventQueue.length === 0) {
            return;
        }

        console.log(`Processing ${this.eventQueue.length} queued events...`);
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];

        for (const event of eventsToProcess) {
            try {
                await this.saveEventToDatabase(event);
            } catch (error) {
                console.error('Error processing queued event:', error);
                this.eventQueue.push(event); // Re-queue failed event
                break; // Stop processing if we hit an error
            }
        }

        if (this.eventQueue.length > 0) {
            console.log(`${this.eventQueue.length} events re-queued due to errors`);
        }
    }

    private getSessionId(): string {
        let sessionId = sessionStorage.getItem('rrweb-session-id');
        if (!sessionId) {
            sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2);
            sessionStorage.setItem('rrweb-session-id', sessionId);
        }
        return sessionId;
    }

    getDebugInfo() {
        return {
            isReady: this.isReady,
            isInitializing: this.isInitializing,
            queuedEvents: this.eventQueue.length,
            database: this.db,
            objectStores: this.db ? Array.from(this.db.objectStoreNames) : []
        };
    }

    async getAllEvents(): Promise<any[]> {
        if (!this.db || !this.isReady) {
            throw new Error('Database not ready');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getEventsBySession(sessionId: string): Promise<any[]> {
        if (!this.db || !this.isReady) {
            throw new Error('Database not ready');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getAllSessions(): Promise<string[]> {
        if (!this.db || !this.isReady) {
            throw new Error('Database not ready');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.getAll();

            request.onsuccess = () => {
                // Extract unique session IDs from the actual records
                const events = request.result;
                const sessionIds = events
                    .map((event: any) => event.sessionId)
                    .filter((sessionId: any) => sessionId && typeof sessionId === 'string')
                    .filter((sessionId: string, index: number, array: string[]) => array.indexOf(sessionId) === index); // unique only

                resolve(sessionIds);
            };

            request.onerror = () => {
                reject(request.error);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async exportSession(sessionId: string): Promise<void> {
        try {
            const events = await this.getEventsBySession(sessionId);

            if (events.length === 0) {
                alert('No events found for this session');
                return;
            }

            // Export just the rrweb events array for direct replay
            const rrwebEvents = events.map(event => event.data);

            // Create and download the file
            const blob = new Blob([JSON.stringify(rrwebEvents, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rrweb-session-${sessionId.substring(0, 15)}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`Exported ${events.length} rrweb events for session ${sessionId}`);
        } catch (error) {
            console.error('Error exporting session:', error);
            alert('Failed to export session. Check console for details.');
        }
    }

    async exportAllSessions(): Promise<void> {
        try {
            const allEvents = await this.getAllEvents();

            if (allEvents.length === 0) {
                alert('No events found to export');
                return;
            }

            // Group events by session
            const sessionGroups = allEvents.reduce((groups, event) => {
                const sessionId = event.sessionId;
                if (!groups[sessionId]) {
                    groups[sessionId] = [];
                }
                groups[sessionId].push(event);
                return groups;
            }, {} as Record<string, any[]>);

            const sessionIds = Object.keys(sessionGroups);
            const dateStr = new Date().toISOString().split('T')[0];

            // Export each session as a separate rrweb-compatible file
            for (const sessionId of sessionIds) {
                const sessionEvents = sessionGroups[sessionId];
                const rrwebEvents = sessionEvents.map((event: any) => event.data);

                const blob = new Blob([JSON.stringify(rrwebEvents, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rrweb-session-${sessionId.substring(0, 15)}-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Small delay between downloads to avoid browser blocking
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`Exported ${sessionIds.length} sessions as separate rrweb-compatible files`);
        } catch (error) {
            console.error('Error exporting all sessions:', error);
            alert('Failed to export sessions. Check console for details.');
        }
    }

    async clearDatabase(): Promise<void> {
        // Mark as not ready immediately
        this.isReady = false;
        this.isInitializing = false;

        // Close existing connection if open
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        // Clear event queue
        this.eventQueue = [];

        // Delete the database
        await this.deleteDatabase();
        console.log('Database cleared and reset');
    }
}

export default function RRWebRecorder() {
    useEffect(() => {
        let stopRecording: (() => void) | null = null;
        const dbManager = RRWebDBManager.getInstance();

        const initRecording = () => {
            if (typeof window !== 'undefined' && window.rrweb) {
                console.log('Starting rrweb recording...');

                stopRecording = window.rrweb.record({
                    emit(event) {
                        // Use the database manager to save events
                        dbManager.saveEvent(event);
                    },
                    // Optional: Create checkpoints every 100 events or 30 seconds
                    checkoutEveryNth: 100,
                    checkoutEveryNms: 30 * 1000,
                });
            }
        };

        // Initialize database first, then start recording
        dbManager.initialize()
            .then(() => {
                console.log('Database manager initialized successfully');

                // Load the rrweb script if not already loaded
                if (!window.rrweb) {
                    const script = document.createElement('script');
                    script.src = '/js/record-perf-branch.js';
                    script.onload = initRecording;
                    script.onerror = (error) => {
                        console.error('Failed to load rrweb script:', error);
                    };
                    document.head.appendChild(script);
                } else {
                    initRecording();
                }
            })
            .catch((error) => {
                console.error('Failed to initialize database manager:', error);
            });

        // Add debug helpers to window for console debugging
        window.debugRRWebDB = () => {
            const debugInfo = dbManager.getDebugInfo();
            console.log('RRWeb Debug Info:', debugInfo);
        };

        window.clearRRWebDB = async () => {
            try {
                await dbManager.clearDatabase();
                console.log('RRWeb database cleared successfully');
                // Re-initialize the database so it's ready for new recordings
                await dbManager.initialize();
                console.log('RRWeb database re-initialized and ready');
            } catch (error) {
                console.error('Failed to clear database:', error);
            }
        };

        // Add export helpers to window
        (window as any).exportRRWebSession = async (sessionId?: string) => {
            try {
                if (!dbManager.getDebugInfo().isReady) {
                    console.error('Database not ready. Please wait for initialization to complete.');
                    return;
                }

                if (sessionId) {
                    await dbManager.exportSession(sessionId);
                } else {
                    const sessions = await dbManager.getAllSessions();
                    console.log('Available sessions:', sessions);
                    console.log('Use exportRRWebSession("session-id") to export a specific session');
                    console.log('Or use exportAllRRWebSessions() to export everything');
                }
            } catch (error) {
                console.error('Failed to export session:', error);
            }
        };

        (window as any).exportAllRRWebSessions = async () => {
            try {
                if (!dbManager.getDebugInfo().isReady) {
                    console.error('Database not ready. Please wait for initialization to complete.');
                    return;
                }
                await dbManager.exportAllSessions();
            } catch (error) {
                console.error('Failed to export all sessions:', error);
            }
        };

        (window as any).listRRWebSessions = async () => {
            try {
                if (!dbManager.getDebugInfo().isReady) {
                    console.error('Database not ready. Please wait for initialization to complete.');
                    return [];
                }

                const sessions = await dbManager.getAllSessions();
                console.log('Available sessions:', sessions);
                for (const sessionId of sessions) {
                    const events = await dbManager.getEventsBySession(sessionId);
                    console.log(`- ${sessionId}: ${events.length} events`);
                }
                return sessions;
            } catch (error) {
                console.error('Failed to list sessions:', error);
                return [];
            }
        };

        // Also expose the database manager globally for advanced usage
        (window as any).rrwebDBManager = dbManager;

        // Cleanup function
        return () => {
            if (stopRecording) {
                stopRecording();
                console.log('rrweb recording stopped');
            }
            // Clean up debug and export functions
            delete window.debugRRWebDB;
            delete window.clearRRWebDB;
            delete (window as any).exportRRWebSession;
            delete (window as any).exportAllRRWebSessions;
            delete (window as any).listRRWebSessions;
            delete (window as any).rrwebDBManager;
        };
    }, []);

    return null; // This component doesn't render anything
}