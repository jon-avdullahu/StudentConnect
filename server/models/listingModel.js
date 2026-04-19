const { pool } = require('../db');

class ListingModel {
  static async getAllActive(max_price, min_price, search) {
    let query = `
      SELECT l.*, u.full_name AS owner_full_name,
        COALESCE(json_agg(p.url) FILTER (WHERE p.url IS NOT NULL), '[]') as photos
      FROM listings l
      LEFT JOIN users u ON u.id = l.owner_id
      LEFT JOIN photos p ON l.id = p.listing_id
      WHERE l.status = $1
    `;
    const values = ['active'];
    let valIndex = 2;

    if (max_price) {
      query += ` AND l.price <= $${valIndex}`;
      values.push(parseFloat(max_price));
      valIndex++;
    }
    if (min_price) {
      query += ` AND l.price >= $${valIndex}`;
      values.push(parseFloat(min_price));
      valIndex++;
    }
    if (search) {
      query += ` AND (l.title ILIKE $${valIndex} OR l.description ILIKE $${valIndex})`;
      values.push(`%${search}%`);
      valIndex++;
    }

    query += ' GROUP BY l.id, u.full_name ORDER BY l.created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT l.*, u.full_name AS owner_full_name,
        COALESCE(json_agg(p.url) FILTER (WHERE p.url IS NOT NULL), '[]') as photos
      FROM listings l
      LEFT JOIN users u ON u.id = l.owner_id
      LEFT JOIN photos p ON l.id = p.listing_id
      WHERE l.id = $1
      GROUP BY l.id, u.full_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(owner_id, title, description, price, location_lat, location_lng, photos) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO listings (owner_id, title, description, price, location_lat, location_lng, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [owner_id, title, description, parseFloat(price), location_lat || null, location_lng || null, 'active']
      );

      const listing = result.rows[0];
      listing.photos = [];

      if (photos && Array.isArray(photos)) {
        for (const url of photos) {
          await client.query('INSERT INTO photos (listing_id, url) VALUES ($1, $2)', [listing.id, url]);
          listing.photos.push(url);
        }
      }
      await client.query('COMMIT');
      return listing;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async update(id, updates, values, valIndex, photos) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (updates.length > 0) {
        values.push(id);
        const query = `UPDATE listings SET ${updates.join(', ')} WHERE id = $${valIndex}`;
        await client.query(query, values);
      }

      if (photos && Array.isArray(photos)) {
        await client.query('DELETE FROM photos WHERE listing_id = $1', [id]);
        for (const url of photos) {
          await client.query('INSERT INTO photos (listing_id, url) VALUES ($1, $2)', [id, url]);
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async checkOwnership(id, userId) {
    const result = await pool.query('SELECT owner_id FROM listings WHERE id = $1', [id]);
    if (result.rowCount === 0) return null; // not found
    return result.rows[0].owner_id === userId;
  }

  static async delete(id) {
    await pool.query('DELETE FROM listings WHERE id = $1', [id]);
  }
}

module.exports = ListingModel;
