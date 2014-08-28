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

  User.get(function(data) { $scope.user = data; });
  $scope.item = {priority: 2, url: 'http://variantweb.net'};

  $scope.addItem = function() {
    $scope.item.owner = userid;
    Item.save($scope.item).$promise.then(function(data) {
      $scope.user.items.push(data);
      $scope.item = {priority: 2};
    });
  };

  $scope.deleteItem = function(itemid) {
    $log.log(itemid);
    Item.delete({itemid: itemid});
    $scope.user.items = $scope.user.items.filter(function(item) {
      $log.log(item._id + ', ' + itemid);
      return item._id != itemid;
    });
  };
}]);
