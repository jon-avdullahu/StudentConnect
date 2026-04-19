const { pool } = require('../db');

class ReportModel {
  static async getAll(status) {
    let query = 'SELECT * FROM reports';
    const values = [];
    
    if (status) {
      query += ' WHERE status = $1';
      values.push(status);
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rowCount > 0 ? result.rows[0] : null;
  }

  static async createReport(reporter_id, reported_entity_type, entity_id, reason) {
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_entity_type, entity_id, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [reporter_id, reported_entity_type, entity_id, reason]
    );
    return result.rows[0];
  }
}

module.exports = ReportModel;
