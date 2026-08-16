import { createCollection } from '@tanstack/db';
import { useState, useEffect } from 'react';

/**
 * Creates a reactive TanStack DB collection with REST prefetch and WebSocket delta sync.
 *
 * @param {Object} options
 * @param {string} options.id - Collection identifier (e.g. 'products', 'orders')
 * @param {(item: any) => any} [options.getKey] - Primary key accessor
 * @param {string} [options.fetchUrl] - Endpoint for initial data population
 * @returns {import('@tanstack/db').Collection}
 */
export function createSyncedCollection({ id, getKey, fetchUrl }) {
  const primaryKeyFn = getKey || ((item) => item.id);

  return createCollection({
    id,
    getKey: primaryKeyFn,
    sync: {
      sync: ({ begin, write, commit }) => {
        let isCancelled = false;

        const hydrate = () => {
          if (!fetchUrl || typeof fetch === 'undefined') return;
          fetch(fetchUrl)
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${id}`);
              const data = await res.json();
              if (isCancelled || !Array.isArray(data)) return;

              begin();
              for (const item of data) {
                write({ type: 'insert', value: item });
              }
              commit();
            })
            .catch((err) => {
              console.warn(`[TanStack DB] Sync error for ${id}:`, err);
            });
        };

        // 1. Initial REST Hydration
        hydrate();

        // 2. Real-time Delta Listener
        const handleDelta = (event) => {
          const delta = event.detail;
          if (!delta || delta.table !== id) return;

          try {
            begin();
            if (delta.action === 'INSERT' && delta.row) {
              write({ type: 'insert', value: delta.row });
            } else if (delta.action === 'UPDATE' && delta.row) {
              write({ type: 'update', value: delta.row });
            } else if (delta.action === 'DELETE' && delta.primaryKey != null) {
              write({ type: 'delete', key: delta.primaryKey });
            }
            commit();
          } catch (err) {
            console.error(`[TanStack DB] Error applying delta to ${id}:`, err);
          }
        };

        const handleResync = () => {
          hydrate();
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('tanstack-db-delta', handleDelta);
          window.addEventListener('resync-data', handleResync);
          return () => {
            isCancelled = true;
            window.removeEventListener('tanstack-db-delta', handleDelta);
            window.removeEventListener('resync-data', handleResync);
          };
        }

        return () => {
          isCancelled = true;
        };
      }
    }
  });
}

/**
 * Global Collections
 */
export const productsCollection = createSyncedCollection({
  id: 'products',
  getKey: (p) => p.id,
  fetchUrl: '/api/products'
});

export const ordersCollection = createSyncedCollection({
  id: 'orders',
  getKey: (o) => o.id,
  fetchUrl: '/api/orders'
});

export const movementsCollection = createSyncedCollection({
  id: 'stock_movements',
  getKey: (m) => m.id,
  fetchUrl: '/api/stock/history'
});

/**
 * React hook to reactively subscribe to a TanStack DB collection's items
 *
 * @template T
 * @param {import('@tanstack/db').Collection} collection
 * @returns {{ data: T[], size: number, isLoading: boolean }}
 */
export function useCollectionItems(collection) {
  const [items, setItems] = useState(() => {
    try {
      return collection.toArray ? collection.toArray() : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    return collection.status === 'loading';
  });

  useEffect(() => {
    // Eagerly trigger sync if idle
    if (collection.status === 'idle') {
      collection.preload?.();
    }

    const update = () => {
      try {
        const arr = collection.toArray ? collection.toArray() : [];
        setItems(arr);
        setIsLoading(collection.status === 'loading');
      } catch (err) {
        console.error('[useCollectionItems] subscription error:', err);
      }
    };

    update();
    const unsubscribe = collection.subscribe ? collection.subscribe(update) : () => {};

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [collection]);

  return {
    data: items,
    size: items.length,
    isLoading
  };
}

/**
 * Dispatches a typed delta event into the client-side TanStack DB collections.
 *
 * @param {{ table: string, action: 'INSERT'|'UPDATE'|'DELETE', row?: any, primaryKey?: any, sequenceId?: number }} delta
 */
export function dispatchTanStackDbDelta(delta) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tanstack-db-delta', { detail: delta }));
  }
}
