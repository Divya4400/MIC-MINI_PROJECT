/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Dec 14 2022 09:14:14 GMT+0000 (Coordinated Universal Time).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames'
], function (
    CONSTANTS,
    GMEConcepts,
    nodePropertyNames
) {

    'use strict';

    function PNVisualizerControl(options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;
        this._widget._client = options.client;

        this._currentNodeId = null;
        this._fireableEvents = null;

    this._networkRootLoaded = false;
    this._initWidgetEventHandlers();

    this._logger.debug("ctor finished");

    this.setFireableEvents = this.setFireableEvents.bind(this);

  }

  PNVisualizerControl.prototype._initWidgetEventHandlers = function () {
    this._widget.onNodeClick = function (id) {
      // Change the current active object
      WebGMEGlobal.State.registerActiveObject(id);
    };
  };

  /* * * * * * * * Visualizer content update callbacks * * * * * * * */
  // One major concept here is with managing the territory. The territory
  // defines the parts of the project that the visualizer is interested in
  // (this allows the browser to then only load those relevant parts).
  PNVisualizerControl.prototype.selectedObjectChanged = function (nodeId) {
    var self = this;

    // Remove current territory patterns
    if (self._currentNodeId) {
        //defined territory id
      self._client.removeUI(self._territoryId);
      self._networkRootLoaded = false; //addme
    }

    self._currentNodeId = nodeId;

    if (typeof self._currentNodeId === "string") {
      // Put new node's info into territory rules
      self._selfPatterns = {};
      //using territory "rule"
      self._selfPatterns[nodeId] = { children: 1 };

      self._territoryId = self._client.addUI(self, function (events) {
        self._eventCallback(events);
      });

      // Updating the territory
      self._client.updateTerritory(self._territoryId, self._selfPatterns);
    }
  };

  /* * * * * * * * Node Event Handling * * * * * * * */
  PNVisualizerControl.prototype._eventCallback = function (events) {
    const self = this;

    events.forEach((event) => {
      if (event.eid && event.eid === self._currentNodeId) {
        if (event.etype == "load" || event.etype == "update") {
          self._networkRootLoaded = true;
        } else {
          return;

        }

      }

    });

    if (events.length && events[0].etype === "complete" && self._networkRootLoaded) {
      // complete means we got all requested data and we do not have to wait for additional load cycles
      self._initPetriNet();
    }
  };

  PNVisualizerControl.prototype._stateActiveObjectChanged = function (
    model,
    activeObjectId
  ) {
    if (this._currentNodeId === activeObjectId) {
      // The same node selected as before - do not trigger
    } else {
      this.selectedObjectChanged(activeObjectId);
    }
    
  };

  /* * * * * * * * Machine manipulation functions * * * * * * * */
  PNVisualizerControl.prototype._initPetriNet = function () {
    const self = this;
    const rawMETA = this._client.getAllMetaNodes();
    const META = {};
    
    rawMETA.forEach((node) => {
      META[node.getAttribute("name")] = node.getId(); //we just need the id...
    });
    const nodes = this._client.getNode(this._currentNodeId);
    const nodeIds = nodes.getChildrenIds();
    //for place
    let placeIds = getTypeIds(this._client, nodeIds,"Place"); 
    //for transition
    let tranIds = getTypeIds(this._client, nodeIds,"Transition");
    //for ArcPlacetotran
    let arcPlaceTranIds = getTypeIds(this._client, nodeIds,"ArcPlacetotran");
    //for ArcTrantoplace
    let arcTranPlaceIds = getTypeIds(this._client, nodeIds,"ArcTrantoplace");
    //for arcPlaceTran
    let arcPlaceTran = getArcsObject(self._client, arcPlaceTranIds);
    //for arcTransPlace
    let arcTranPlace = getArcsObject(self._client, arcTranPlaceIds);
    let inMatrix = getMatrix(placeIds, tranIds, arcTranPlace, true);
    let startPlaceId = getStartPlaceId(inMatrix);
    let outMatrix = getMatrix(placeIds, tranIds, arcPlaceTran, false);
    
    //starting for deadlock
    let petriNet = {
        isDeadlock: _petriNetInDeadlock,
        startPlace: startPlaceId,
        //defined places
        places:{},
        //defined transition
        transitions:{},
        //matrixes
        inMatrix : inMatrix,
        outMatrix: outMatrix,
        //arcs
        arcPlaceToTran: arcPlaceTran,
        arcTranToPlace: arcTranPlace
    };

    nodeIds.forEach((id)=>{
      const node = self._client.getNode(id);

      if (node.isTypeOf(META["Place"])) {
        petriNet.places[id] = {
          id: id,
          name: node.getAttribute("name"),
          marks: parseInt(node.getAttribute("Marks")),
          nextPlaceIds: getNextPlaces(
            id,
            arcPlaceTran,
            arcTranPlace
          ),

          outTransitions: Object.keys(outMatrix[id]).filter(
            (tranId) => outMatrix[id][tranId]
          ),
          inTransitions: Object.keys(inMatrix[id]).filter(
            (tranId) => inMatrix[id][tranId]
          ),
          outArcs: arcPlaceTran.filter((arc) => arc.src === id),
          position: node.getRegistry("position"),
        };

      }else if (node.isTypeOf(META["Transition"])) {
        petriNet.transitions[id] = {
          id: id,
          name: node.getAttribute("name"),
          outPlaces: Object.keys(inMatrix).filter(
            (placeId) => inMatrix[placeId][id]
          ),
          inPlaces: Object.keys(outMatrix).filter(
            (placeId) => outMatrix[placeId][id]
          ),
          outArcs: arcTranPlace.filter((arc) => arc.src === id),
          position: node.getRegistry("position"),
        };

      }

    });

    petriNet.setFireableEvents = this.setFireableEvents;
    self._widget.initMachine(petriNet);
    
  };

 //created a transition view through fire events
  PNVisualizerControl.prototype.setFireableEvents = function (enabledTransitions) {
    this._fireableEvents = enabledTransitions;
    if (enabledTransitions && enabledTransitions.length >= 1) {

      // filling dropdown button with options, only including enabled transitions options
      this.$btnEventSelector.clear();
      enabledTransitions.forEach((transition) => {
        this.$btnEventSelector.addButton({
          text: `Fire the transition ${transition.name}`,
          title: `Fire the transition ${transition.name}`,
          data: { event: transition },
          clickFn: (data) => {
            this._widget.fireEvent(data.event);
          },

        });

      });
      
    } else if (enabledTransitions && enabledTransitions.length === 0) {
      this._fireableEvents = null;
    }
    
    this._displayToolbarItems();
  };

  let getTypeIds =(client, nodeIds, typeName)=>{
    let ans =[];
    nodeIds.forEach((id, i)=>{
      let node = client.getNode(id);
      let type = node.getMetaTypeId();
      let name = client.getNode(type).getAttribute("name");
      if(name == typeName){
        ans.push(id);
      }

    });

    return ans;
  };

  let getArcsObject = (client, nodeIds)=>{
    let ans =[];
    nodeIds.forEach((id,i)=>{
      let node = client.getNode(id);
      ans.push({
        id : id,
        name : node.getAttribute("name"),
        src: node.getPointerId('src'),
        dst :node.getPointerId('dst')
      })

    });

    return ans;
  };

  let getMatrix=(placeIds, tranIds, arcTranPlace, isI)=>{
    let matrix ={};
    placeIds.forEach((pid, i)=>{
      matrix[pid] ={};
      tranIds.forEach((tid,j)=>{
        if(isI){
          matrix[pid][tid]=arcTranPlace.some((arc, k) => {
            return arc.src === tid && arc.dst === pid;
          });
        }else{
          matrix[pid][tid] = arcTranPlace.some((arc, index) => {
            return arc.src === pid && arc.dst === tid;
          });
        }
        
      });
    });
    return matrix;
  };


  let getStartPlaceId = (inputMatrix) => {
    // the first place has no in-flow and only out-flow.
    for (const placeId in inputMatrix) {
      if (placeisDeadEnd(inputMatrix, placeId)) {
        return placeId;
      }

    }

    // if the place is no place with no inflow, then uses any of the places as the start point.
    for (const placeId in inputMatrix) {
      return placeId;
    }

  };

  let placeisDeadEnd = (matrix, placeId) => {
    return Object.entries(matrix[placeId]).every((arr) => {
      return !arr[1];
    });

  };


  let _petriNetInDeadlock = (petri_Net) => {
    return Object.keys(petri_Net.transitions).every((transId) => {
      let placetotrans = Object.keys(petri_Net.outMatrix).filter(
        (placeId) => outputMatrix[placeId][transId]
      );
      placetotrans.every(
        (inPlaceId) => {
          parseInt(petri_Net.places[inPlaceId].currentMarking) <= 0;
        }

      );

    });

  };

  //for next places transition
  let getNextPlace = (
    placeId,
    arcsPlacetoTransition,
    arcsTransitiontoPlace
  ) => {
    let nextPlace = [];
    let outFlowArcs = arcsPlacetoTransition.filter((arc) => arc.src === placeId);
    outFlowArcs.forEach((arc_p2t) => {
      nextPlace.push(
        ...arcsTransitiontoPlace
          .filter((arc_t2p) => arc_t2p.src === arc_p2t.dst)
          .map((arc_t2p) => {
            // not including already traversed in case of loops
            if (arc_t2p.src === arc_p2t.dst) {
              return arc_t2p.dst;
            }

          })

      );

    });

    return nextPlace;
  };


  /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
  PNVisualizerControl.prototype.destroy = function () {
    this._detachClientEventListeners();
    this._removeToolbarItems();
  };

  PNVisualizerControl.prototype._attachClientEventListeners = function () {
    const self = this;
    self._detachClientEventListeners();
    WebGMEGlobal.State.on(
      "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
      self._stateActiveObjectChanged,
      self
    );
  };

  PNVisualizerControl.prototype._detachClientEventListeners = function () {
    WebGMEGlobal.State.off(
      "change:" + CONSTANTS.STATE_ACTIVE_OBJECT,
      this._stateActiveObjectChanged
    );
  };

  PNVisualizerControl.prototype.onActivate = function () {
    this._attachClientEventListeners();
    this._displayToolbarItems();

    if (typeof this._currentNodeId === "string") {
      WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {
        suppressVisualizerFromNode: true,
      });
    }
  };

  PNVisualizerControl.prototype.onDeactivate = function () {
    this._detachClientEventListeners();
    this._hideToolbarItems();
  };



  /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
  PNVisualizerControl.prototype._displayToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      this.$btnEventSelector.show();
      this.$btnReset.show();
    } else {
      this._initializeToolbar();
    }
  };

  PNVisualizerControl.prototype._hideToolbarItems = function () {
    if (this._toolbarInitialized === true) {
      for (var i = this._toolbarItems.length; i--; ) {
        this._toolbarItems[i].hide();
      }
    }
  };

  
  PNVisualizerControl.prototype._initializeToolbar = function () {
    var toolBar = WebGMEGlobal.Toolbar;
    const self = this;
    self._toolbarItems = [];
    self._toolbarItems.push(toolBar.addSeparator());

    self.$btnReset = toolBar.addButton({
      title: "Reset ",
      text: "Reset ",
      icon: "glyphicon glyphicon-fast-backward",
      clickFn: function () {
        self._widget.resetMachine();
      },
    });

    PNVisualizerControl.prototype._removeToolbarItems = function () {
        if (this._toolbarInitialized === true) {
          for (var i = this._toolbarItems.length; i--; ) {
            this._toolbarItems[i].destroy();
          }
        }
      };
    
    self._toolbarItems.push(self.$btnReset);

    self.$btnEventSelector = toolBar.addDropDownButton({
      text: "Play a specific transition ",
      title: "Play a specific transition",
      icon: "glyphicon glyphicon-play",
    });
    self._toolbarItems.push(self.$btnEventSelector);
    self.$btnEventSelector.hide();
    self._toolbarInitialized = true;
  };
  return PNVisualizerControl;
});