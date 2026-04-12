const authorization = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // req.user harus sudah di-set oleh middleware authentication
      const { role } = req.user;

      if (!allowedRoles.includes(role)) {
        throw {
          name: "Forbidden",
          message: "You are not allowed to access this resource",
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = authorization;
