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

    async clearDatabase(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.isReady = false;
        this.isInitializing = false;
        this.eventQueue = [];
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
                    script.src = '/js/record.js';
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
            } catch (error) {
                console.error('Failed to clear database:', error);
            }
        };

        // Cleanup function
        return () => {
            if (stopRecording) {
                stopRecording();
                console.log('rrweb recording stopped');
            }
            // Clean up debug functions
            delete window.debugRRWebDB;
            delete window.clearRRWebDB;
        };
    }, []);

    return null; // This component doesn't render anything
}