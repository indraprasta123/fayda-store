const errorHandler = (error, req, res, next) => {
  const errorName = error.name;
  console.log(error);

  switch (errorName) {
    case "SequelizeValidationError":
    case "SequelizeUniqueConstraintError":
      res.status(400).json({ message: error.errors[0].message });
      break;
    case "JsonWebTokenError":
      res.status(401).json({ message: "Invalid Token" });
      break;
    case "BadRequest":
      res.status(400).json({ message: error.message });
      break;
    case "NotFound":
      res.status(404).json({ message: error.message });
      break;
    case "Unauthorized":
      res.status(401).json({ message: error.message });
      break;
    case "Forbidden":
      res.status(403).json({ message: error.message });
      break;
    default:
      res.status(500).json({ message: "Internal Server Error" });
      break;
  }
};

module.exports = errorHandler;
