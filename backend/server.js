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

//app.use('/api/auth', expressJwt({ secret: 'wishlist' }));
app.use('/api/auth', function(req, res, next) {
  req.user = '53f416403ad981885d6e9e87';
  return next();
});

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', false);
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  next();
});

app.post('/api/login', function(req, res) {
  User.findOne({ username: req.body.username }, function(err, user) {
    if (err || !user)
      return res.status(401).json({ message: 'User not found' });
    if (!user.validPassword(req.body.password))
      return res.status(401).json({ message: 'Bad password' });
    var token = jwt.sign(user._id, 'wishlist', { expiresInMinutes: 1 });
    return res.json({ token: token, id: user._id });
  });
});

app.get('/api/auth/users', function(req, res) {
  User.find({}, 'name', function(err, users) {
    if (err)
      return res.status(500).json({ message: 'Failed to retreive users' });
    return res.json(users);
  });
});

app.get('/api/auth/users/:userid', function(req, res) {
  var itemFields = "name price priority url";
  if (req.params.userid != req.user)
    itemFields += " bought";
  User.findById(req.params.userid, 'name items').
       populate('items', itemFields).
       exec(function(err, user) {
    if (err)
      return res.status(404).json({ message: 'No user with id ' + req.params.userid });
    return res.json(user);
  });
});

// debug only
app.get('/api/auth/items', function(req, res) {
  Item.find({}, function(err, items) {
    if (err)
      return res.status(500).json({ message: 'Failed to retreive items' });
    return res.json(items);
  });
});

app.post('/api/auth/items', function(req, res) {
  User.findById(req.user, function(err, owner) {
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

// make sure that attempts to PUT or DELETE existing item only
// allowed by the item owner
/*app.use('/api/auth/items/:itemid', function (req, res, next) {
  Item.findById(req.params.itemid, 'owner', function(err, item) {
    if (item.owner != req.user)
      return res.status(403).json({ message: 'This item does not belong to you' });
    return next();
  });
});*/

app.put('/api/auth/items/:itemid', function(req, res) {
  Item.findByIdAndUpdate(req.params.itemid, { $set: req.body }, function(err, item) {
    if (err || !item)
      return res.status(404).json({ message: 'No item with id ' + req.params.itemid});
    return res.json(item);
  });
});

app.delete('/api/auth/items/:itemid', function(req, res) {
  Item.findByIdAndRemove(req.params.itemid, function(err, item) {
    if (err || !item)
      return res.status(404).json({ message: 'No item with id ' + req.params.itemid});
    User.findById(req.user, function(err, owner) {
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
