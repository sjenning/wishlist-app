// vim: tabstop=2 shiftwidth=2 expandtab

var bodyParser = require('body-parser'),
  express = require('express'),
  logger = require('morgan'),
  mongoose = require('mongoose'),
  expressJwt = require('express-jwt'),
  jwt = require('jsonwebtoken');
var User = require('./models/user');
var Item = require('./models/item');

mongoose.connect('mongodb://localhost/wishlist');

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.static(__dirname + 'public'));

// Every path under /api/auth requires authentication token
app.use('/api/auth', expressJwt({ secret: 'secretnomore' }));

// Only needed when doing cross-site access
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', false);
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
  next();
});

// Obtain authentication token
app.post('/api/login', function(req, res) {
  User.findOne({ username: req.body.username }, function(err, user) {
    if (err || !user)
      return res.status(401).json({ message: 'User not found' });
    if (!user.validPassword(req.body.password))
      return res.status(401).json({ message: 'Bad password' });
    delete user.password;
    var token = jwt.sign(user, 'secretnomore', { expiresInMinutes: 1 });
    return res.json({ token: token, id: user._id });
  });
});

// Add new user
app.post('/api/register', function(req, res) {
  var user = new User(req.body);
  user.save(function(err, user) {
    if (err || !user)
      return res.status(500).json({ message: 'Failed to register' });
    delete user.password;
    return res.json(user);
  });
});

// Get user list
app.get('/api/auth/users', function(req, res) {
  User.find({}, 'name', function(err, users) {
    if (err)
      return res.status(500).json({ message: 'Failed to retreive users' });
    return res.json(users);
  });
});

// Get user data
app.get('/api/auth/users/:userid', function(req, res) {
  var itemFields = "name price priority url";
  if (req.params.userid != req.user._id)
    itemFields += " buyer";
  User.findById(req.params.userid, 'name items')
  .populate('items', itemFields)
  .exec(function(err, user) {
    if (err)
      return res.status(404).json({ message: 'No user with id ' + req.params.userid });
    if (req.params.userid != req.user._id) {
      var options = {
        path: 'items.buyer',
        model: 'User',
        select: 'name'
      };
      User.populate(user, options, function(err, user) {
        if (err || !user) {
          return res.status(404).json({ message: 'No user with id ' + req.params.userid });
        }
        return res.json(user);
      });
    } else {
        return res.json(user);
    }
  });
});

// Add item
app.post('/api/auth/items', function(req, res) {
  User.findById(req.body.owner, function(err, owner) {
    if (err || !owner)
      return res.status(500).json({ message: 'Failed to lookup owner' });
    var item = new Item(req.body);
    item.owner = owner;
    item.save(function(err) {
      if (err)
        return res.status(400).json({ message: 'Missing required fields' });
      owner.items.push(item);
      owner.save(function(err) {
        if (err)
          return res.status(500).json({ message: 'Failed to update owner' });
        return res.json(item);
      });
    });
  });
});

// Update item
app.post('/api/auth/items/:itemid', function(req, res) {
  delete req.body._id;
  var owner;
  Item.findById(req.params.itemid, function(err, item) {
    if (err || !item)
      return res.status(404).json({ message: 'No item with id ' + req.params.itemid});
    owner = item.owner;
  });

  var item = {};
  if (owner != req.user._id) {
    // Non-owner is only allowed to update the buyer field
    item.buyer = req.body.buyer;
  } else {
    item = req.body;
  }
  Item.findByIdAndUpdate(req.params.itemid, item, function(err, item) {
    if (err || !item)
      return res.status(404).json({ message: 'No item with id ' + req.params.itemid});
    if (item.buyer) {
      var options = {
        path: 'buyer',
        model: 'User',
        select: 'name'
      };
      Item.populate(item, options, function(err, item) {
        return res.json(item);
      });
    } else {
      return res.json(item);
    }
  });
});

// Delete item
app.delete('/api/auth/items/:itemid', function(req, res) {
  Item.findByIdAndRemove(req.params.itemid, function(err, item) {
    if (err || !item)
      return res.status(404).json({ message: 'No item with id ' + req.params.itemid});
    User.findById(req.user._id, function(err, owner) {
      if (err || !owner)
         return res.status(500).json({ message: 'Failed to lookup owner' });
      owner.items.pull(req.params.itemid);
      owner.save(function(err) {
        if (err)
          return res.status(500).json({ message: 'Failed to update owner' });
        return res.json({ message: 'Item deleted' });
      });
    });
  });
});

app.listen(2000);
