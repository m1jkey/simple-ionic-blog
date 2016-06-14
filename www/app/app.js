(function(ng) { "use strict";

ng
.module('blogApp', ['ionic', 'firebase'])
.config(blogConfig)
.factory('User', userService)
.factory('Articles', articleService)
.factory('Popup', popupService)
.controller('BlogCtrl', BlogController)
.controller('LoginCtrl', LoginController);

blogConfig.$inject      = ['$stateProvider', '$urlRouterProvider'];
articleService.$inject  = ['$firebaseArray'];
popupService.$inject    = ['$ionicPopup'];
LoginController.$inject = ['$controller', '$state', '$ionicActionSheet', 'User', 'Popup'];
BlogController.$inject  = ['$scope', '$filter', '$ionicModal', '$ionicActionSheet', '$stateParams', 'User', 'Articles', 'Popup'];

/************************\
        CONTROLLER
\************************/
function BlogController($scope, $filter, $ionicModal, $ionicActionSheet, $stateParams, User, Articles, Popup) {

    var ctrl = this;

    ctrl.articles = Articles;
    ctrl.isLoggedIn = User.isLoggedIn();
    ctrl.showModal = showModal;
    ctrl.hideModal = hideModal;
    ctrl.addArticle         = addArticle;
    ctrl.removeArticle      = removeArticle;
    ctrl.editArticle        = editArticle;
    ctrl.updateArticle      = updateArticle;
    ctrl.showSingleArticle  = showSingleArticle;

    //add post
    $ionicModal.fromTemplateUrl('./app/blog/new.tpl.html', function(modal) {

        ctrl.addModal = modal;

    },{scope: $scope});

    //update post
    $ionicModal.fromTemplateUrl('./app/blog/update.tpl.html', function(modal) {

        ctrl.updateModal = modal;

    },{scope: $scope});

    function showModal(modalName) {

        if (modalName === "blog") {

            ctrl.addModal.show();

        } else if (modalName === "update") {

            ctrl.updateModal.show();
        }
    };

    function hideModal(modalName) {

        if (modalName === "blog") {

            ctrl.addModal.hide();

        } else if (modalName === "update") {

            ctrl.updateModal.hide();

        }
    };

    function addArticle(data) {

        if (data) {
            var now = new Date();
            var date = $filter('date')(now, "dd, MMM");
            var article = {
                'title': data.title,
                'body': data.body,
                'date': date
            }
            Popup.showAlert('Success', article.title+' toegevoegd', function() {
                ctrl.hideModal('blog');
            });
            Articles.$add( article );
            data.title = '';
            data.body = '';
        }
    };

    function removeArticle(article) {

        var hideSheet = $ionicActionSheet.show({
            titleText: "Are you sure to delete this blog?",
            destructiveText: "Delete",
            destructiveButtonClicked: function() {

                Articles.$remove( article );
                return true;
            },
            cancelText: "Cancel",
            buttonClicked: function(index) {
                return true;
            }
        });
    };

    function editArticle(article) {

        ctrl.showModal('update');
        ctrl.newArticle = article;
    };

    function updateArticle(newArticle) {

        Popup.showAlert('Success', newArticle.title+' bijgewerkt', function() {
            Articles.$save(newArticle);
            ctrl.hideModal('update');
        });


    };

    function showSingleArticle() {
        var name = $stateParams.name;
    }

}

function LoginController($controller, $state, $ionicActionSheet, User, Popup) {

    var ctrl = this;
    ctrl.login = login;
    ctrl.logout = logout;

    function login(user){

        console.log(user);
        if(!User.isLoggedIn()){

            var status = User.validate(user);

            if(!status.error && status.isLoggedIn){

                User.login(status.isLoggedIn);
                User.isLoggedIn();

                Popup.showAlert('Welkom', 'Hallo '+user.name, function() {
                    $state.go('blog');
                });
                user.name = '';
                user.password = '';

            }else{

                Popup.showAlert('Error', status.error);
                user.password = '';
            }
        }
    };

    function logout(){

        var hideSheet = $ionicActionSheet.show({
            titleText: "Are you sure?",
            destructiveText: "Logout",
            destructiveButtonClicked: function(){
                User.logout();
                User.isLoggedIn();

                $state.go('login');
                return true;
            },
            cancelText: "Cancel",
            buttonClicked: function(index){
                return true;
            }
        });
    };
}

/************************\
         SERVICE
\************************/
function userService() {

    var service = {
        User        : User,
        isLoggedIn  : isLoggedIn,
        validate    : validate,
        login       : login,
        logout      : logout
    };
    return service;

    function User(){

        var userAuth = {
            name: 'Admin',
            password: '123456'
        };

        window.localStorage.setItem('User', ng.toJson(userAuth));
        var user = window.localStorage['User'];
        return ng.fromJson(user);
    };

    function isLoggedIn(){
        return window.localStorage['isLoggedIn'];
    };

    function validate(user){

        var User = this.User();
        var isLoggedIn = false;

        if (user) {
            if (user.name === User.name && user.password === User.password) {
                return {isLoggedIn : true};
            }

            return{
                error: "Gebruiksnaam of watchwoord is onjuist!",
                isLoggedIn
            }

        } else {
            return {isLoggedIn};
        }
    };

    function login(status){
        window.localStorage.setItem('isLoggedIn', status);
    };

    function logout(){
        window.localStorage.removeItem('isLoggedIn');
    };
}

function articleService($firebaseArray){

	var articlesRef = new Firebase("https://stage-blog.firebaseio.com/items");
	return $firebaseArray(articlesRef);
}

function popupService($ionicPopup) {
    var service = {
        showAlert : showAlert
    };
    return service;

    function showAlert(title, tpl, cb) {
        var alertPopup = $ionicPopup.alert({
            title : title,
            template : tpl
        });

        if(cb) {
            alertPopup.then(cb);
        }
    }
}

/************************\
         PROVIDER
\************************/
function blogConfig($stateProvider, $urlRouterProvider) {

    $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: 'app/login/login.tpl.html',
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            onEnter: function($state, User) {

                if(User.isLoggedIn()){
                   $state.go('blog');
                }
            }
        })

        .state('blog', {
            url: '/blog/all',
            templateUrl: 'app/blog/home.tpl.html',
            controller: 'BlogCtrl',
            controllerAs: 'blog',
            onEnter: function($state, User) {

                if (!User.isLoggedIn()) {
                   $state.go('login');
                }
            }
        })

        .state('postDetails', {
            url: '/blog/post/:name',
            views: {
                'post-details': {
                    templateUrl: 'app/blog/details.tpl.html',
                    controller: 'BlogCtrl',
                    controllerAs: 'blog'
                }
            }
        });

    $urlRouterProvider.otherwise('/blog/all');

};

})(angular);
