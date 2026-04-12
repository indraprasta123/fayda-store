const bcrypt = require("bcryptjs");

const hashPassword = (inPassword) => {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(inPassword, salt);
  return hash;
};

const comparePassword = (inputPassword, hashPassword) => {
  return bcrypt.compareSync(inputPassword, hashPassword);
};

module.exports = { hashPassword, comparePassword };
