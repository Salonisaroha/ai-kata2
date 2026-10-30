class AppError extends Error {
  constructor(status, code, message, { tradeIndex, field } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.tradeIndex = tradeIndex;
    this.field = field;
  }
}

class ValidationError extends AppError {
  constructor(message, details, code = 'VALIDATION_ERROR') {
    super(400, code, message, details);
  }
}

class NotFoundError extends AppError {
  constructor(message, details, code = 'PORTFOLIO_NOT_FOUND') {
    super(404, code, message, details);
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
