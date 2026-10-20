// role-based access control middleware
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    // check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    // support single string or array of allowed roles
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // check if user role is permitted
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: You do not have permission for this resource' });
    }

    next();
  }
};

module.exports = roleMiddleware;
