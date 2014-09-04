// vim: tabstop=2 shiftwidth=2 expandtab

var mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    default: null,
  },

  // priority
  //   Like: 1
  //   Want: 2
  //   Need: 3
  priority: {
    type: Number,
    default: 1,
  },

  url: {
    type: String,
    default: '',
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
});

module.exports = mongoose.model('Item', itemSchema);
