const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const findOrCreate =require("mongoose-findorcreate");
const passportLocalMongoose = require("passport-local-mongoose");

const Session = new Schema({
  refreshToken: {
    type: String,
    default: "",
  },
});

const User = new Schema({

  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "",
  },
  googleId: {
    type: String,
    default: "",
  },
  authStrategy: {
    type: String,
    default: "",
  },
  points: {
    type: Number,
    default: 0,
  },
  photo: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  refreshToken: {
    type: [Session],
  },
});

//Remove refreshToken from the response
User.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.refreshToken;
    return ret;
  },
});

User.plugin(passportLocalMongoose);
User.plugin(findOrCreate);
module.exports = mongoose.model("User", User);
