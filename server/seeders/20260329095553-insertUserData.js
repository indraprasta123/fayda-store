"use strict";

const { hashPassword } = require("../helpers/bcrypt");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Users", [
      {
        name: "indra",
        email: "indra@gmail.com",
        password: hashPassword("indra123"),
        role: "admin",
        provider: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "prasta",
        email: "prasta@gmail.com",
        password: hashPassword("prasta123"),
        role: "user",
        provider: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", null, {});
  },
};
