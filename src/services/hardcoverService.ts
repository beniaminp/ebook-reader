/**
 * Hardcover Service
 *
 * GraphQL client for Hardcover (https://hardcover.app) API.
 * Uses CapacitorHttp on native platforms to bypass CORS.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type {
  HardcoverConfig,
  HardcoverBook,
  HardcoverUserBook,
  HardcoverStatusId,
} from '../types/hardcover';

const API_URL = 'https://api.hardcover.app/v1/graphql';
const CONFIG_KEY = 'hardcover_config';
const MAX_REQUESTS_PER_MINUTE = 55;

class HardcoverService {
  private config: HardcoverConfig | null = null;
  private requestTimestamps: number[] = [];

  async loadConfig(): Promise<HardcoverConfig | null> {
    if (this.config) return this.config;
    try {
      const { value } = await Preferences.get({ key: CONFIG_KEY });
      if (value) {
        this.config = JSON.parse(value);
        return this.config;
      }
    } catch (e) {
      console.error('Error loading Hardcover config:', e);
    }
    return null;
  }

  async saveConfig(config: HardcoverConfig): Promise<void> {
    this.config = config;
    await Preferences.set({ key: CONFIG_KEY, value: JSON.stringify(config) });
  }

  async clearConfig(): Promise<void> {
    this.config = null;
    await Preferences.remove({ key: CONFIG_KEY });
  }

  isNativeOnly(): boolean {
    return !Capacitor.isNativePlatform();
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
    if (this.requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = 60000 - (now - oldestInWindow) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.requestTimestamps.push(Date.now());
  }

  private async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const config = await this.loadConfig();
    if (!config?.token) throw new Error('Hardcover not configured');

    await this.enforceRateLimit();

    const body = JSON.stringify({ query, variables });

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: API_URL,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        data: body,
      });
      if (response.status !== 200) {
        throw new Error(`Hardcover API error: ${response.status}`);
      }
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      if (data.errors?.length) {
        throw new Error(data.errors[0].message);
      }
      return data.data as T;
    } else {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body,
      });
      if (!response.ok) {
        throw new Error(`Hardcover API error: ${response.status}`);
      }
      const data = await response.json();
      if (data.errors?.length) {
        throw new Error(data.errors[0].message);
      }
      return data.data as T;
    }
  }

  async testConnection(token: string): Promise<string> {
    // Temporarily set token for this request
    const prevConfig = this.config;
    this.config = { token, autoSync: false };
    try {
      const result = await this.graphql<{ me: Array<{ username: string }> }>(`
        query { me { username } }
      `);
      const username = result.me?.[0]?.username;
      if (!username) throw new Error('Could not retrieve username');
      return username;
    } finally {
      this.config = prevConfig;
    }
  }

  async searchBooks(query: string): Promise<HardcoverBook[]> {
    const result = await this.graphql<{
      books: HardcoverBook[];
    }>(`
      query SearchBooks($query: String!) {
        books(where: {title: {_ilike: $query}}, limit: 10) {
          id
          title
          contributions { author { name } }
          isbn_13
          isbn_10
          description
          pages
          image { url }
        }
      }
    `, { query: `%${query}%` });
    return result.books || [];
  }

  async findBookByIsbn(isbn: string): Promise<HardcoverBook | null> {
    const result = await this.graphql<{
      books: HardcoverBook[];
    }>(`
      query FindByIsbn($isbn: String!) {
        books(where: {_or: [{isbn_13: {_eq: $isbn}}, {isbn_10: {_eq: $isbn}}]}, limit: 1) {
          id
          title
          contributions { author { name } }
          isbn_13
          isbn_10
          description
          pages
          image { url }
        }
      }
    `, { isbn });
    return result.books?.[0] || null;
  }

  async getUserBooks(): Promise<HardcoverUserBook[]> {
    const result = await this.graphql<{
      me: Array<{
        user_books: HardcoverUserBook[];
      }>;
    }>(`
      query {
        me {
          user_books {
            id
            book_id
            status_id
            rating
            review
            percent_complete
            book {
              id
              title
              contributions { author { name } }
              isbn_13
              isbn_10
              description
              pages
              image { url }
              rating
              ratings_count
            }
          }
        }
      }
    `);
    return result.me?.[0]?.user_books || [];
  }

  async upsertUserBook(
    bookId: number,
    data: { statusId?: HardcoverStatusId; rating?: number; percentageRead?: number }
  ): Promise<boolean> {
    const setFields: string[] = [];
    if (data.statusId !== undefined) setFields.push(`status_id: ${data.statusId}`);
    if (data.rating !== undefined) setFields.push(`rating: ${data.rating}`);
    if (data.percentageRead !== undefined) setFields.push(`percent_complete: ${data.percentageRead}`);

    if (setFields.length === 0) return false;

    await this.graphql(`
      mutation UpsertUserBook($bookId: Int!) {
        insert_user_books_one(
          object: { book_id: $bookId, ${setFields.join(', ')} }
          on_conflict: { constraint: user_books_pkey, update_columns: [${data.statusId !== undefined ? 'status_id,' : ''} ${data.rating !== undefined ? 'rating,' : ''} ${data.percentageRead !== undefined ? 'percent_complete,' : ''}] }
        ) {
          id
        }
      }
    `, { bookId });
    return true;
  }
}

export const hardcoverService = new HardcoverService();
