/**
 * Created by PAVEI on 30/09/2014.
 * Updated by Ross Martin on 12/05/2014
 * Updated by Davide Pastore on 04/14/2015
 * Updated by Michel Vidailhet on 05/12/2015
 * Updated by Rene Korss on 11/25/2015
 */

angular.module('angularLazyLoadCache', []);

angular.module('angularLazyLoadCache')

	.provider('ImgCache', function() {

		ImgCache.$init = function() {

			ImgCache.init(function() {
				ImgCache.$deferred.resolve();
			}, function() {
				ImgCache.$deferred.reject();
			});
		};

		this.manualInit = false;

		this.setOptions = function(options) {
			angular.extend(ImgCache.options, options);
		};

		this.setOption = function(name, value) {
			ImgCache.options[name] = value;
		};

		this.$get = ['$q', function ($q) {

			ImgCache.$deferred = $q.defer();
			ImgCache.$promise = ImgCache.$deferred.promise;

			if(!this.manualInit) {
				ImgCache.$init();
			}

			return ImgCache;
		}];

	})

	.directive('lazyScroll', ['$rootScope',
		function($rootScope) {
			return {
				restrict: 'A',
				link: function ($scope, $element) {
					var origEvent = $scope.$onScroll;
					$scope.$onScroll = function () {
						$rootScope.$broadcast('lazyScrollEvent');

						if(typeof origEvent === 'function'){
							origEvent();
						}
					};
				}
			};
		}])

	.directive('imageLazySrc', ['$document', '$timeout', '$ionicScrollDelegate', '$compile',
		function ($document, $timeout, $ionicScrollDelegate, $compile) {
			return {
				restrict: 'A',
				scope: {
					lazyScrollResize: "@lazyScrollResize",
					imageLazyBackgroundImage: "@imageLazyBackgroundImage",
					imageLazySrc: "@"
				},
				link: function ($scope, $element, $attributes) {
					console.log("Entrato");
					if (!$attributes.imageLazyDistanceFromBottomToLoad) {
						$attributes.imageLazyDistanceFromBottomToLoad = 0;
					}
					if (!$attributes.imageLazyDistanceFromRightToLoad) {
						$attributes.imageLazyDistanceFromRightToLoad = 0;
					}

					var loader;
					if ($attributes.imageLazyLoader) {
						loader = $compile('<div class="image-loader-container"><ion-spinner class="image-loader" icon="' + $attributes.imageLazyLoader + '"></ion-spinner></div>')($scope);
						$element.after(loader);
					}

					$scope.$watch('imageLazySrc', function (oldV, newV) {
						console.log("Cambio");
						if(loader)
							loader.remove();
						if ($attributes.imageLazyLoader) {
							loader = $compile('<div class="image-loader-container"><ion-spinner class="image-loader" icon="' + $attributes.imageLazyLoader + '"></ion-spinner></div>')($scope);
							$element.after(loader);
						}
						var deregistration = $scope.$on('lazyScrollEvent', function () {
								//    console.log('scroll');
								if (isInView()) {
									loadImage();
									deregistration();
								}
							}
						);
						$timeout(function () {
							if(isInView()) {
								console.log("in View");
								loadImage();
								deregistration();
							} else {
								console.log("no in View")
							}
						}, 1000);
					});
					var deregistration = $scope.$on('lazyScrollEvent', function () {
							// console.log('scroll');
							if (isInView()) {
								loadImage();
								deregistration();
							}
						}
					);

					function setImg(type, el, src) {

						ImgCache.getCachedFileURL(src, function(src, dest) {

							if(type === 'bg') {
								el.css({'background-image': 'url(' + dest + ')' });
							} else {
								el.attr('src', dest);
							}
						});
					}

					function loadImg(type, el, src) {
						ImgCache.$promise.then(function() {

							ImgCache.isCached(src, function(path, success) {

								if (success) {
									console.log("cache: " + src);
									setImg(type, el, src);
								} else {
									console.log("no cache: " + src);
									ImgCache.cacheFile(src, function() {
										setImg(type, el, src);
									});
								}

							});
						});
					}

					function loadImage() {
						console.log("loadImage");
						//Bind "load" event
						$element.bind("load", function (e) {
							if ($attributes.imageLazyLoader) {
								loader.remove();
							}
							if ($scope.lazyScrollResize == "true") {
								//Call the resize to recalculate the size of the screen
								$ionicScrollDelegate.resize();
							}
							$element.unbind("load");
						});

						if ($scope.imageLazyBackgroundImage == "true") {
							var bgImg = new Image();
							bgImg.onload = function () {
								if ($attributes.imageLazyLoader) {
									loader.remove();
								}
								$element[0].style.backgroundImage = 'url(' + $attributes.imageLazySrc + ')'; // set style attribute on element (it will load image)
								if ($scope.lazyScrollResize == "true") {
									//Call the resize to recalculate the size of the screen
									$ionicScrollDelegate.resize();
								}
							};
							/**
							 * Uso imgCache prima di andare a settare il background
							 *
							 * @type {string}
							 */
							if(window.cordova) {
								loadImg('bg', $element, $attributes.imageLazySrc);
							} else {
								bgImg.src = $attributes.imageLazySrc;
							}
						} else {
							/**
							 * Uso imgCache prima di andare a settare l'src
							 *
							 * @type {string}
							 */
							if(window.cordova) {
								loadImg('src', $element, $attributes.imageLazySrc);
							} else {
								$element[0].src = $attributes.imageLazySrc; // set src attribute on element (it will load image)
							}
						}
					}

					function isInView() {
						var clientHeight = $document[0].documentElement.clientHeight;
						var clientWidth = $document[0].documentElement.clientWidth;
						var imageRect = $element[0].getBoundingClientRect();
						return (imageRect.top >= 0 && imageRect.top <= clientHeight + parseInt($attributes.imageLazyDistanceFromBottomToLoad))
							&& (imageRect.left >= 0 && imageRect.left <= clientWidth + parseInt($attributes.imageLazyDistanceFromRightToLoad));
					}

					// bind listener
					// listenerRemover = scrollAndResizeListener.bindListener(isInView);

					// unbind event listeners if element was destroyed
					// it happens when you change view, etc
					$element.on('$destroy', function () {
						deregistration();
					});

					// explicitly call scroll listener (because, some images are in viewport already and we haven't scrolled yet)
					$timeout(function () {
						if (isInView()) {
							loadImage();
							deregistration();
						}
					}, 500);
				}
			};
		}]);
