/**
 * Settings and theme operations.
 */

import { Capacitor } from '@capacitor/core';
import { TABLES } from '../schema';
import { getDb } from './connection';

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export async function getSetting<T = any>(key: string): Promise<T | null> {
  if (!Capacitor.isNativePlatform()) {
    const value = localStorage.getItem(`setting_${key}`);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value as any;
      }
    }
    return null;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT value FROM ${TABLES.APP_SETTINGS} WHERE key = ?;`, [
      key,
    ]);
    if (result.values && result.values.length > 0) {
      return JSON.parse(result.values[0].value);
    }
    return null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

export async function setSetting(key: string, value: any, category?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    return true;
  }

  try {
    const database = await getDb();
    await database.run(
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

export async function getAllSettings(): Promise<Record<string, any>> {
  if (!Capacitor.isNativePlatform()) {
    const settings: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('setting_')) {
        const value = localStorage.getItem(key);
        if (value) {
          const settingKey = key.replace('setting_', '');
          try {
            settings[settingKey] = JSON.parse(value);
          } catch {
            settings[settingKey] = value;
          }
        }
      }
    }
    return settings;
  }

  try {
    const database = await getDb();
    const result = await database.query(`SELECT key, value FROM ${TABLES.APP_SETTINGS};`);

    const settings: Record<string, any> = {};
    for (const row of result.values || []) {
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

export async function getThemes(): Promise<any[]> {
  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.THEMES} ORDER BY name;`);
    return (result.values || []).map((row) => ({
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

export async function getTheme(id: string): Promise<any | null> {
  try {
    const database = await getDb();
    const result = await database.query(`SELECT * FROM ${TABLES.THEMES} WHERE id = ?;`, [id]);
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
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
