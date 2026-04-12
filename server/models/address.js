"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
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

      this.hasMany(models.Order, {
        foreignKey: "address_id",
        as: "orders",
      });
    }
  }
  Address.init(
    {
      user_id: DataTypes.INTEGER,
      label: DataTypes.STRING,
      recipient_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Recipient is required",
          },
          notEmpty: {
            msg: "Recipient is required",
          },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Phone is required",
          },
          notEmpty: {
            msg: "Phone is required",
          },
        },
      },
      address: {
        type: DataTypes.TEXT,
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
      city: DataTypes.STRING,
      province: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Province is required",
          },
          notEmpty: {
            msg: "Province is required",
          },
        },
      },
      postal_code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Postal code is required",
          },
          notEmpty: {
            msg: "Postal code is required",
          },
        },
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Latitude is required",
          },
          notEmpty: {
            msg: "Latitude is required",
          },
        },
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Longitude is required",
          },
          notEmpty: {
            msg: "Longitude is required",
          },
        },
      },
      notes: DataTypes.TEXT,
      is_main: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Address",
    },
  );
  return Address;
};
