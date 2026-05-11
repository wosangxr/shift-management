const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  // Store computer mode: Bypass authentication
  req.user = { id: 'store-terminal', role: 'ADMIN', name: 'ระบบร้านค้า' };
  next();
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    // Store computer mode: Bypass role checks
    next();
  };
}

module.exports = { authenticate, authorizeRoles };
