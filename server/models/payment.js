"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
      });
    }
  }
  Payment.init(
    {
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Order is required",
          },
          notEmpty: {
            msg: "Order is required",
          },
        },
      },
      transaction_id: DataTypes.STRING,
      payment_type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Payment type is required",
          },
          notEmpty: {
            msg: "Payment type is required",
          },
        },
      },
      gross_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          notNull: {
            msg: "Gross amount is required",
          },
          notEmpty: {
            msg: "Gross amount is required",
          },
        },
      },
      payment_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          notNull: {
            msg: "Payment status is required",
          },
          notEmpty: {
            msg: "Payment status is required",
          },
        },
      },
      payment_url: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Payment",
    },
  );
  return Payment;
};
