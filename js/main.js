var url = location.port === '8888' ? '/proxy' : 'https://cgstats.proxy.magusgeek.com';

moment.updateLocale('en', {
  longDateFormat : {
      LT: "HH:mm",
      L: "DD/MM/YYYY"
  }
});

angular.module('cgstats', ['ui.router'])

.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/app');

  $stateProvider

  .state('app', {
    url: '/app',
    template: '<ui-view></ui-view>',
    controller: 'app'
  })

  .state('app.stats', {
    url: '/{game}/{player}',
    templateUrl: '/templates/stats.html',
    controller: 'list',
    params: {
      countDraws: null
    }
  });
})

.controller('app', function($state) {
  if ($state.current.name === 'app' && window.localStorage && angular.isObject(localStorage) && angular.isFunction(localStorage.getItem)) {
    var game = localStorage.getItem('game') || '',
        player = localStorage.getItem('player') || '',
        countDraws = localStorage.getItem('countDraws') === 'true';

    if (game.trim() && player.trim()) {
      $state.go('app.stats', {
        game: game,
        player: player,
        countDraws: countDraws
      }, {
        reload: true
      });
    }
  }
})

.controller('form', function($scope, $http, $state, $rootScope) {
  $scope.player = '';
  $scope.game = '';

  $scope.multiList = [];
  $scope.contestList = [];

  $http.get(url + '/contest-list').then(function (response) {
    $scope.contestList = response.data;
  });
  $http.get(url + '/multi-list').then(function (response) {
    $scope.multiList = response.data;
  });

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams) {
    if (toState.name == 'app.stats') {
      $scope.player = toParams.player;
      $scope.game = toParams.game;
      $scope.countDraws = toParams.countDraws;
    }
  });

  $scope.search = function() {
    if ($scope.game.trim() && $scope.player.trim()) {
      $state.go('app.stats', {
        game: $scope.game,
        player: $scope.player,
        countDraws: $scope.countDraws
      }, {
        reload: true
      });
    }
  };
})

.controller('list', function($scope, $http, $stateParams, $timeout) {
  $scope.loading = true;

  if (window.localStorage && angular.isObject(localStorage) && angular.isFunction(localStorage.setItem)) {
    localStorage.setItem('game', $stateParams.game);
    localStorage.setItem('player', $stateParams.player);
    localStorage.setItem('countDraws', $stateParams.countDraws);
  }

  $http.get(url + '/search?game=' + encodeURIComponent($stateParams.game.trim()) + '&player=' + encodeURIComponent($stateParams.player.trim()) + ($stateParams.countDraws ? ('&countDraws=' + $stateParams.countDraws) : ''))
  .then(function (response) {

    $scope.fail = false;
    $scope.date = moment().format('HH:mm:ss');

    $scope.sortType = 'scoreKey';
    $scope.sortReverse = true;

    $scope.player = response.data.player;
    $scope.stats = response.data.stats.stats || response.data.stats;
    $scope.details = response.data.stats.users;
    $scope.mode = response.data.mode;
    $scope.game = $stateParams.game;

    if ($scope.mode == 'optim') {
      $scope.score = 0;

      for (var i = 0; i < 5 && i < $scope.stats.length; ++i) {
        $scope.score += $scope.stats[i].points;
      }
    } else {
      $scope.details.forEach(function(line) {
        line.submit = line.creationTime || 0;

        if (line.submit) {
          line.submitText = `${moment(line.submit).calendar()}`;
          line.progressText = line.percentage < 100 ? ` (${line.percentage} %)` : '';
        }
      });
    }

    if ($scope.details) {
      $scope.csv = 'Rank;Nick;Score;Winrate;WinrateErrorDown;WinrateErrorUp;Wins;Loses;Draws;Total\n';
      $scope.csv += $scope.details

      .sort(function(a, b) {
        return a.rank > b.rank ? +1 : -1;
      })

      .map(function(line) {
        return [line.rank, line.pseudo, line.score, line.winrate, line.winrateErrorDown, line.winrateErrorUp, line.beaten, line.lose, line.draw, line.total].join(';');
      }).join('\n');
    } else {
      $scope.csv = '';
    }

    $timeout(function() {
      window.scrollTo(0, document.getElementById('search-time').getBoundingClientRect().top);
    }, 1, false);
  })

  .catch(function(response) {
    $scope.fail = true;
    $scope.status = response.status;
  })

  .then(function() {
    $scope.loading = false;
  });
});
