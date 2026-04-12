"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      this.belongsTo(models.Address, {
        foreignKey: "address_id",
        as: "address",
      });

      this.hasMany(models.OrderItem, {
        foreignKey: "order_id",
        as: "items",
      });

      this.hasOne(models.Payment, {
        foreignKey: "order_id",
        as: "payment",
      });

      this.hasMany(models.Rating, {
        foreignKey: "order_id",
        as: "ratings",
      });
    }
  }
  Order.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "User is required",
          },
          notEmpty: {
            msg: "User is required",
          },
        },
      },
      address_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Address is required",
          },
          notEmpty: {
            msg: "Address is required",
          },
        },
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          notNull: {
            msg: "Total price is required",
          },
          notEmpty: {
            msg: "Total price is required",
          },
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          notNull: {
            msg: "Status is required",
          },
          notEmpty: {
            msg: "Status is required",
          },
        },
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Payment method is required",
          },
          notEmpty: {
            msg: "Payment method is required",
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
    },
    {
      sequelize,
      modelName: "Order",
    },
  );
  return Order;
};
