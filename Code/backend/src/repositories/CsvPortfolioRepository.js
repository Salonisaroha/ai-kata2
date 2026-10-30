const fs = require('fs');
const { parse } = require('csv-parse/sync');
const Decimal = require('decimal.js');
const Portfolio = require('../domain/Portfolio');
const Holding = require('../domain/Holding');

/**
 * Portfolio repository contract (JS has no interfaces); consumers depend only on:
 *   findById(id: string) -> Portfolio | undefined
 *   listIds() -> string[]   (source order)
 * This CSV-backed class is the one implementation.
 */
class DataConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataConfigurationError';
  }
}

const REQUIRED_COLUMNS = ['portfolio_id', 'cash_balance', 'restricted_securities', 'max_position_pct', 'current_holdings'];
const NUMBER_RE = /^\d+(\.\d+)?$/;

function parseNumber(text, label, where) {
  const t = (text ?? '').trim();
  if (!NUMBER_RE.test(t)) {
    throw new DataConfigurationError(`${where}: ${label} must be a non-negative number, got "${text}".`);
  }
  return new Decimal(t);
}

function parseHoldings(text, where) {
  const t = (text ?? '').trim();
  if (t === '') return [];
  const seen = new Set();
  return t.split(';').map((entry) => {
    const parts = entry.split(':').map((p) => p.trim());
    if (parts.length !== 3 || parts[0] === '') {
      throw new DataConfigurationError(`${where}: malformed holding "${entry}", expected SEC:qty:price.`);
    }
    if (seen.has(parts[0])) throw new DataConfigurationError(`${where}: duplicate holding "${parts[0]}".`);
    seen.add(parts[0]);
    return new Holding(
      parts[0],
      parseNumber(parts[1], `holding ${parts[0]} quantity`, where),
      parseNumber(parts[2], `holding ${parts[0]} price`, where),
    );
  });
}

class CsvPortfolioRepository {
  /** Loads and validates once; throws DataConfigurationError on any problem (A11). */
  constructor(csvPath) {
    this.portfolios = new Map();
    let content;
    try {
      content = fs.readFileSync(csvPath, 'utf8');
    } catch (err) {
      throw new DataConfigurationError(`Cannot read portfolio CSV at "${csvPath}": ${err.code || err.message}`);
    }
    let records;
    try {
      records = parse(content, { columns: true, skip_empty_lines: true, bom: true, trim: false });
    } catch (err) {
      throw new DataConfigurationError(`Portfolio CSV is not parseable: ${err.message}`);
    }
    if (records.length === 0) throw new DataConfigurationError('Portfolio CSV contains no rows.');
    const columns = Object.keys(records[0]);
    for (const c of REQUIRED_COLUMNS) {
      if (!columns.includes(c)) throw new DataConfigurationError(`Portfolio CSV is missing column "${c}".`);
    }

    records.forEach((r, i) => {
      const id = (r.portfolio_id ?? '').trim();
      const where = `Row ${i + 2} (${id || 'no id'})`;
      if (id === '') throw new DataConfigurationError(`${where}: portfolio_id is empty.`);
      if (this.portfolios.has(id)) throw new DataConfigurationError(`${where}: duplicate portfolio_id.`);
      const cap = parseNumber(r.max_position_pct, 'max_position_pct', where);
      if (cap.lte(0) || cap.gt(100)) {
        throw new DataConfigurationError(`${where}: max_position_pct must be in (0, 100].`);
      }
      const restricted = (r.restricted_securities ?? '').split(';').map((s) => s.trim()).filter((s) => s !== '');
      this.portfolios.set(id, new Portfolio({
        portfolioId: id,
        cashBalance: parseNumber(r.cash_balance, 'cash_balance', where),
        restrictedSecurities: restricted,
        maxPositionPct: cap,
        holdings: parseHoldings(r.current_holdings, where),
      }));
    });
  }

  findById(id) {
    return this.portfolios.get(id);
  }

  listIds() {
    return [...this.portfolios.keys()];
  }
}

module.exports = CsvPortfolioRepository;
module.exports.DataConfigurationError = DataConfigurationError;
