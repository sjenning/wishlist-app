// vim: tabstop=2 shiftwidth=2 expandtab

var app = angular.module('wishlistApp', ['ngRoute', 'ngResource', 'ngCookies']);

app.factory('authInterceptor', ['$cookies', function($cookies) {
  return {
    request: function(config) {
      if ($cookies.token)
        config.headers.Authorization = 'Bearer ' + $cookies.token;
      return config;
    },
    response: function(response) {
      if (response.status === 401) {
        delete $cookies.token;
        $location.path('/login');
      }
      return response;
    }
  };
}]);

app.config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
    $routeProvider.when('/', {
      redirectUrl: '/login'
    });
    $routeProvider.when('/login', {
      templateUrl: 'partials/login.html',
      controller: 'LoginController',
      public: true
    });
    $routeProvider.when('/register', {
      templateUrl: 'partials/register.html',
      controller: 'RegisterController',
      public: true
    });
    $routeProvider.when('/users', {
      templateUrl: 'partials/userlist.html',
      controller: 'UserListController'
    });
    $routeProvider.when('/users/:userid', {
      templateUrl: 'partials/user.html',
      controller: 'UserController'
    });
    $routeProvider.otherwise({redirectTo: '/'});
    $httpProvider.interceptors.push('authInterceptor');
}]);

app.run(['$rootScope', '$location', '$cookies', function($rootScope, $location, $cookies) {
  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    if (!$cookies.token && !next.public)
      $location.path("/login");
  });
}]);

app.controller('NavbarController', [ '$scope', '$cookies', '$location', function($scope, $cookies, $location) {
  $scope.homeroute = '#/users/' + $cookies.id;

  $scope.logout = function() {
    delete $cookies.token;
    delete $cookies.id;
    $location.path('/login');
  };
}]);

app.controller('LoginController', [ '$scope', '$resource', '$cookies', '$location', function($scope, $resource, $cookies, $location) {
  var Login = $resource('http://localhost:2000/api/login');
  $scope.user = {};

  $scope.login = function() {
    Login.save($scope.user).$promise
    .then(function(data) {
      $cookies.token = data.token;
      $cookies.id = data.id;
      $location.path('/users/' + data.id);
    })
    .catch(function() {
      delete $cookies.token;
      delete $cookies.id;
      $scope.message = {type: 'error', value: 'Bad username or password'};
    });
  };
}]);

app.controller('RegisterController', [ '$scope', '$resource', '$cookies', '$location', function($scope, $resource, $cookies, $location)  {
  var User = $resource('http://localhost:2000/api/register');
  var Login = $resource('http://localhost:2000/api/login');
  $scope.user = {};

  $scope.register = function() {
    if ($scope.user.password != $scope.user.passwordconfirm) {
      $scope.message = {type: 'error', value: 'Passwords do not match' };
      return;
    }
    User.save($scope.user).$promise
    .then(function(data) {
      Login.save($scope.user).$promise
      .then(function(data) {
        $cookies.token = data.token;
        $cookies.id = data.id;
        $location.path('/users/' + data.id);
      });
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to register'};
    });
  };
}]);

app.controller('UserListController', [ '$scope', '$resource', '$cookies', function($scope, $resource, $cookies) {
  var userid = $cookies.id;
  var Users = $resource('http://localhost:2000/api/auth/users');

  Users.query().$promise
  .then(function(data) {
    $scope.users = data;
    $scope.users = $scope.users.filter(function(entry) {
      return entry._id != userid;
    });
  })
  .catch(function() {
     $scope.message = { type: 'error', value: 'Unable to get user list' };
  });
}]);

app.controller('UserController', [ '$scope', '$resource', '$log', '$routeParams', '$cookies', function($scope, $resource, $log, $routeParams, $cookies) {
  var userid = $cookies.id;
  var User = $resource('http://localhost:2000/api/auth/users/:userid');
  var Item = $resource('http://localhost:2000/api/auth/items/:itemid');

  $scope.item = {priority: 2};
  $scope.user = {items: []};
  User.get({userid: $routeParams.userid}).$promise
  .then(function(data) {
    $scope.user = data;
  })
  .catch(function() {
    $scope.message = {type: 'error', value: 'Unable to load user data'};
  });

  $scope.addItem = function() {
    $scope.item.owner = $routeParams.userid;
    Item.save($scope.item).$promise
    .then(function(data) {
      $scope.user.items.push(data);
      $scope.item = {priority: 2};
      $scope.message = {type: 'success', value: 'Item added'};
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to add item'};
    });
  };

  $scope.deleteItem = function(item) {
    Item.delete({itemid: item._id}).$promise
    .then(function() {
      $scope.user.items = $scope.user.items.filter(function(entry) {
        return entry._id != item._id;
      });
      $scope.message = {type: 'success', value: 'Item deleted'};
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to delete item'};
    });
  };

  $scope.saveItem = function(item) {
    Item.save({itemid: item._id}, item).$promise
    .then(function(data) {
      $scope.message = {type: 'success', value: 'Item edited'};
      delete $scope.editItem;
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to edit item'};
    });
  };

  $scope.isEditItem = function(item) {
    return item == $scope.editItem;
  };

  $scope.showEdit = function(item) {
    $scope.editItem = item;
  };

  $scope.hideEdit = function(item) {
    delete $scope.editItem;
  };

  $scope.isMyItemList = function() {
    return $scope.user._id == userid;
  };

  $scope.isChangeable = function(item) {
    return !item.buyer || item.buyer._id == userid;
  }

  $scope.isBought = function(item) {
    return !!item.buyer;
  }

  $scope.toggleItemBought = function(item) {
    if (!item.buyer)
      item.buyer = userid;
    else
      item.buyer = null;
    Item.save({itemid: item._id}, item).$promise
    .then(function(data) {
      item.buyer = data.buyer;
      $scope.message = {type: 'success', value: 'Item updated'};
    })
    .catch(function() {
      $scope.message = {type: 'error', value: 'Unable to update item'};
    });
  };
}]);

app.directive('itemForm', function() {
  return {
    restrict: 'E',
    templateUrl: 'partials/itemform.html',
  };
});
