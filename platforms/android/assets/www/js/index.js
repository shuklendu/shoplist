/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

function flush(){
    window.localStorage.removeItem("shopListCounter");
    window.localStorage.removeItem("shopListObj");
};

angular.module('shopListApp', [])
    .factory('shopListServices', ['$window', function(win) {
        var shopListServices = {};
        
        shopListServices.setLocalItem = function(key, value) {
            window.localStorage.setItem(key, JSON.stringify(value));
        };

        shopListServices.getLocalItem = function(key) {
            return JSON.parse(window.localStorage.getItem(key));
        };

        shopListServices.getLocalLists = function(){
            return this.getLocalItem("shopListObj") !== null ? this.getLocalItem("shopListObj") : {};
        };

        return shopListServices;
    }])
    .controller('shopListController', ['$scope', 'shopListServices', function($scope, shopListServices) {
        
        $scope.listItems = shopListServices.getLocalLists();
        $scope.formError = false;
        $scope.modalTemplate = "modal-delete.html";
        $scope.setItemDel = function(){
            $scope.itemDel = true;    
        };
        $scope.itemDel = false;
        
        $scope.createList = function(){
            if(!$scope.listName){
                $scope.formError = true
                return;
            }
            var shopListCounter = shopListServices.getLocalItem("shopListCounter");
            if (shopListCounter === null) {
                shopListCounter = 0;
                shopListServices.setLocalItem("shopListCounter", 0);
            } else {
                shopListCounter += 1;
                shopListServices.setLocalItem("shopListCounter", shopListCounter);
            }
            $scope.listItems["shopList-"+shopListCounter]={
                id: "shopList-"+shopListCounter,
                label: $scope.listName,
                items: {},
                itemsDone: {},
                itmsCount: 0,
                itmsDoneCount: 0
            };
            $scope.listName = "";
            $scope.$emit('refreshList');
            shopListServices.setLocalItem("shopListObj", $scope.listItems);
        };
        
        $scope.openList = function(listId, listLabel){
            $scope.activeList = {
                id: listId,
                label: listLabel
            };
            $.mobile.navigate( "#createList" ); 
            console.log($scope.listItems[$scope.activeList.id])           
        };

        $scope.confirmDelete = function(deleteId, deleteLabel, itemID){
            $scope.deleteItem = {
                id: deleteId,
                name: deleteLabel,
                itemId: itemID
            };
            $scope.showModal = true;
        };

        $scope.deleteList = function(){
            if( $scope.deleteItem.itemId ) {
                delete $scope.listItems[$scope.deleteItem.id].items[$scope.deleteItem.itemId];
            } else {
                delete $scope.listItems[$scope.deleteItem.id];
            }
            shopListServices.setLocalItem("shopListObj", $scope.listItems);
            $scope.showModal = false;
            $scope.deleteItem = {};
        };

        $scope.cancelModal = function(){
            $scope.showModal = false;
            $scope.deleteItem = {};
        };

        $scope.addItems = function(){
            if(!$scope.itemName){
                $scope.formError = true
                return;
            }
            $scope.listItems[$scope.activeList.id].items["item-"+$scope.listItems[$scope.activeList.id].itmsCount] = {
                name: $scope.itemName,
                qty: $scope.itemQty,
                itemId : "item-"+$scope.listItems[$scope.activeList.id].itmsCount
            };
            $scope.listItems[$scope.activeList.id].itmsCount++;
            $scope.$emit('refreshList');
            $scope.itemName = $scope.itemQty = "";
            shopListServices.setLocalItem("shopListObj", $scope.listItems);
        };

        $scope.done = function(itemId){
            $scope.listItems[$scope.activeList.id].items[itemId].done = true;
            $scope.listItems[$scope.activeList.id].itemsDone[itemId] = $scope.listItems[$scope.activeList.id].items[itemId];
            delete $scope.listItems[$scope.activeList.id].items[itemId];
            $scope.listItems[$scope.activeList.id].itmsDoneCount++;
            $scope.$emit('refreshList');
            shopListServices.setLocalItem("shopListObj", $scope.listItems);
        };

        $scope.undo = function(itemId){
            $scope.listItems[$scope.activeList.id].itemsDone[itemId].done = false;
            $scope.listItems[$scope.activeList.id].items[itemId] = $scope.listItems[$scope.activeList.id].itemsDone[itemId];
            delete $scope.listItems[$scope.activeList.id].itemsDone[itemId];
            $scope.listItems[$scope.activeList.id].itmsDoneCount--;
            $scope.$emit('refreshList');
            shopListServices.setLocalItem("shopListObj", $scope.listItems);
        };

    }])
    .directive('required', [function() {
        function link(scope, element, attrs) {
            
            scope.$watch("formError",function(value){
                if(value){
                    angular.element(element).on("keyup",function(){
                        if($(this).val()){
                            scope.$apply(function () {
                                scope.formError = false;
                            });
                        }
                    });
                } else {
                    angular.element(element).unbind("keyup");
                }
            });
        }

        return {
            restrict: 'C',
            link: link
        };
    }])
    .directive('renderListBeforeShow', ['$timeout', function($timeout) {
        function link(scope, element, attrs) {
            $(document).on("pagebeforeshow","#"+attrs.id,function(){
                scope.$emit('refreshList');
                scope.$apply(function () {
                    scope.formError = false;
                    scope.showModal = false;
                    scope.deleteItem = {};
                });
            });
            scope.$on('refreshList', function() {
                $timeout(function(){
                    $("[data-role='listview']:visible").listview('refresh');
                }, 1);              
            });
        }
        return {
            link: link
        };
    }])
    .directive('tapHold', [function() {
        function link(scope, element, attrs) {
            angular.element(element).on("taphold", function(e) {
                e.stopPropagation();
                var itemId = angular.element(element).parent("li").prop("id");
                scope.$apply(function(){
                    scope.confirmDelete(scope.activeList.id, attrs.tapHold, itemId);
                });
            });
        }
        return {
            link: link
        };
    }]);