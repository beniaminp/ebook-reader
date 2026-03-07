/**
 * Settings and theme operations using expo-sqlite.
 */

import { TABLES } from '../schema';
import { getDb } from '../connection';

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export function getSetting<T = any>(key: string): T | null {
  try {
    const database = getDb();
    const row = database.getFirstSync(
      `SELECT value FROM ${TABLES.APP_SETTINGS} WHERE key = ?;`,
      [key]
    ) as any;
    if (row) {
      return JSON.parse(row.value);
    }
    return null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

export function setSetting(key: string, value: any, category?: string): boolean {
  try {
    const database = getDb();
    database.runSync(
      `INSERT INTO ${TABLES.APP_SETTINGS} (id, key, value, category, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = excluded.updated_at;`,
      [
        `setting-${key}`,
        key,
        JSON.stringify(value),
        category || null,
        Math.floor(Date.now() / 1000),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error setting setting:', error);
    return false;
  }
}

export function getAllSettings(): Record<string, any> {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT key, value FROM ${TABLES.APP_SETTINGS};`
    );

    const settings: Record<string, any> = {};
    for (const row of rows as any[]) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  } catch (error) {
    console.error('Error getting all settings:', error);
    return {};
  }
}

// ============================================================================
// THEME OPERATIONS
// ============================================================================

export function getThemes(): any[] {
  try {
    const database = getDb();
    const rows = database.getAllSync(
      `SELECT * FROM ${TABLES.THEMES} ORDER BY name;`
    );
    return (rows as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      isDefault: row.is_default === 1,
      backgroundColor: row.background_color,
      textColor: row.text_color,
      secondaryColor: row.secondary_color,
      fontFamily: row.font_family,
      fontSize: row.font_size,
      lineHeight: row.line_height,
      textAlignment: row.text_alignment,
      marginSize: row.margin_size,
      customCss: row.custom_css,
    }));
  } catch (error) {
    console.error('Error getting themes:', error);
    return [];
  }
}

export function getTheme(id: string): any | null {
  try {
    const database = getDb();
    const row = database.getFirstSync(
      `SELECT * FROM ${TABLES.THEMES} WHERE id = ?;`,
      [id]
    ) as any;
    if (row) {
      return {
        id: row.id,
        name: row.name,
        isDefault: row.is_default === 1,
        backgroundColor: row.background_color,
        textColor: row.text_color,
        secondaryColor: row.secondary_color,
        fontFamily: row.font_family,
        fontSize: row.font_size,
        lineHeight: row.line_height,
        textAlignment: row.text_alignment,
        marginSize: row.margin_size,
        customCss: row.custom_css,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
}
