"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Products", "ai_caption", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("Products", "ai_tags", {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Products", "ai_caption");
    await queryInterface.removeColumn("Products", "ai_tags");
  },
};
