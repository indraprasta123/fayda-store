"use strict";
const { Model } = require("sequelize");
const { hashPassword } = require("../helpers/bcrypt");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasOne(models.Profile, {
        foreignKey: "user_id",
        as: "profile",
      });

      this.hasMany(models.Address, {
        foreignKey: "user_id",
        as: "addresses",
      });

      this.hasOne(models.Cart, {
        foreignKey: "user_id",
        as: "cart",
      });

      this.hasMany(models.Order, {
        foreignKey: "user_id",
        as: "orders",
      });

      this.hasMany(models.Rating, {
        foreignKey: "user_id",
        as: "ratings",
      });
    }
  }
  User.init(
    {
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notNull: {
            msg: "Email is required",
          },
          notEmpty: {
            msg: "Email is required",
          },
          isEmail: {
            msg: "Email is not valid",
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Password is required",
          },
          notEmpty: {
            msg: "Password is required",
          },
          len: {
            args: [6, 255],
            msg: "Password must be at least 6 characters",
          },
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user",
        validate: {
          notNull: {
            msg: "Role is required",
          },
          notEmpty: {
            msg: "Role is required",
          },
        },
      },
      provider: {
        type: DataTypes.STRING,
        defaultValue: "local",
      },
      provider_id: DataTypes.STRING,
      reset_password_token: DataTypes.STRING,
      reset_password_expires: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  User.beforeCreate((el) => {
    el.password = hashPassword(el.password);
  });
  return User;
};
