var mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
  bought: {
    type: Boolean,
    default: false
  },

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
  }
});

module.exports = mongoose.model('Item', itemSchema);
