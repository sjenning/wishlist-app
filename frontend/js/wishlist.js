// vim: tabstop=2 shiftwidth=2 expandtab

var app = angular.module('wishlistApp', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
      templateUrl: 'welcome.html'
    });
    $routeProvider.when('/users', {
      templateUrl: 'userlist.html',
      controller: 'UserListController'
    });
    $routeProvider.when('/users/:userid', {
      templateUrl: 'user.html',
      controller: 'UserController'
    });
    $routeProvider.otherwise({redirectTo: '/'});
}]);

app.controller('UserListController', [ '$scope', '$resource', function($scope, $resource) {
  var Users = $resource('http://localhost:2000/api/auth/users');
  Users.query(function(data) { $scope.users = data; });
}]);

app.controller('UserController', [ '$scope', '$resource', '$log', function($scope, $resource, $log) {
  var userid = '53f416403ad981885d6e9e87';
  var User = $resource('http://localhost:2000/api/auth/users/:userid', {userid: userid});
  var Item = $resource('http://localhost:2000/api/auth/items/:itemid');

  $scope.item = {priority: 2};
  $scope.user = {items: []};
  User.get().$promise
  .then(function(data) {
    $scope.user = data;
  })
  .catch(function() {
    $scope.message = {type: 'error', value: 'Unable to load user data'};
  });

  $scope.addItem = function() {
    $scope.item.owner = userid;
    Item
    .save($scope.item).$promise.then(function(data) {
      $scope.user.items.push(data);
      $scope.item = {priority: 2};
      $scope.message = {type: 'success', value: 'Item added'};
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to add item'};
    });
  };

  $scope.deleteItem = function(itemid) {
    Item.delete({itemid: itemid}).$promise
    .then(function() {
      $scope.user.items = $scope.user.items.filter(function(item) {
        return item._id != itemid;
      });
      $scope.message = {type: 'success', value: 'Item deleted'};
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to delete item'};
    });
  };
}]);
