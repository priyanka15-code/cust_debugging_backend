// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  sName: {
    type: String,
    required: true
  },
  sEmail: {
    type: String,
    required: true,
    unique: true
  },
  sPassword: {
    type: String,
    required: true
  },
  sAccess: {
    type: String,
    required: true,
    enum: ["Admin", "Customer"],
    default: "Customer",
  },
  developerId: {
    type: String, 
    default: null
  },
  pin:{
    type: String,
    default:null
  }

});

const User = mongoose.model('User', userSchema);

module.exports = User;
