FigisLayerSwitcher = OpenLayers.Class(OpenLayers.Control.LayerSwitcher, {

    /**
     * Property: groupDivs 
	 * Object with {DOMElements}, {Booleans} and {Strings} 
	 */ 
     groups: { 
              groupDivs:{}, 
              checked: {}, 
              layers:{}, 
              display: {}             
              },   

    /**
     * Constructor: OpenLayers.Control.LayerSwitcher
     *
     * Parameters:
     * options - {Object}
     */
    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);
        this.layerStates = [];
    },
    
    /**
     * Method: clearLayersArray
     * User specifies either "base" or "data". we then clear all the
     *     corresponding listeners, the div, and reinitialize a new array.
     *
     * Parameters:
     * layersType - {String}
     */
    clearLayersArray: function(layersType) {
        this[layersType + "LayersDiv"].innerHTML = "";
        this[layersType + "Layers"] = [];
        this.groups.groupDivs = {};
    },

    /**
     * Method: checkRedraw
     * Checks if the layer state has changed since the last redraw() call.
     *
     * Returns:
     * {Boolean} The layer state changed since the last redraw() call.
     */
    checkRedraw: function() {
        if ( !this.layerStates.length ||
             (this.map.layers.length != this.layerStates.length) ) {
            return true;
        }

        for (var i = 0, len = this.layerStates.length; i < len; i++) {
            var layerState = this.layerStates[i];
            var layer = this.map.layers[i];
            if ( (layerState.name != layer.name) ||
                 (layerState.inRange != layer.inRange) ||
                 (layerState.id != layer.id) ||
                     (layerState.visibility != layer.visibility) ||
                     (layer.showLegendGraphic)) {
                    redraw = true;
                    break;
            }    
        }    
        return redraw;
    },
    
    /**
     * Method: redraw
     * Goes through and takes the current state of the Map and rebuilds the
     *     control to display that state. Groups base layers into a
     *     radio-button group and lists each data layer with a checkbox.
     *
     * Returns:
     * {DOMElement} A reference to the DIV DOMElement containing the control
     */
    redraw: function() {
        //if the state hasn't changed since last redraw, no need
        // to do anything. Just return the existing div.
        if (!this.checkRedraw()) {
            return this.div;
        }

        //clear out previous layers
        this.clearLayersArray("base");
        this.clearLayersArray("data");

        var containsOverlays = false;
        var containsBaseLayers = false;

        // Save state -- for checking layer if the map state changed.
        // We save this before redrawing, because in the process of redrawing
        // we will trigger more visibility changes, and we want to not redraw
        // and enter an infinite loop.
        var len = this.map.layers.length;
        this.layerStates = new Array(len);
        for (var i=0; i <len; i++) {
            var layer = this.map.layers[i];
            this.layerStates[i] = {
                'name': layer.name,
                'visibility': layer.visibility,
                'inRange': layer.inRange,
                'id': layer.id
            };
            
        // create group divs 
            if (layer.group && !layer.isBaseLayer) { 
                layer.group = layer.group.replace(/\/$/,""); 
                layer.group = layer.group.replace(/^\//,""); 
                this.createGroupDiv(layer.group,layer); 
            }             
        }    

        var layers = this.map.layers.slice();
        if (!this.ascending) { layers.reverse(); }
        for(var i=0, len=layers.length; i<len; i++) {
            var layer = layers[i];
            var baseLayer = layer.isBaseLayer;

            if (layer.displayInLayerSwitcher) {

                if (baseLayer) {
                    containsBaseLayers = true;
                } else {
                    containsOverlays = true;
                }

                // only check a baselayer if it is *the* baselayer, check data
                //  layers if they are visible
                var checked = (baseLayer) ? (layer == this.map.baseLayer)
                                          : layer.getVisibility();

                // create input element
                var inputElem = document.createElement("input"),
                    // The input shall have an id attribute so we can use
                    // labels to interact with them.
                    inputId = OpenLayers.Util.createUniqueID(
                        this.id + "_input_"
                    );

                inputElem.id = inputId;
                inputElem.name = (baseLayer) ? this.id + "_baseLayers" : layer.name;
                inputElem.type = (baseLayer) ? "radio" : "checkbox";
                inputElem.value = layer.name;
                inputElem.checked = checked;
                inputElem.defaultChecked = checked;
                inputElem.className = "olButton";
                inputElem._layer = layer.id;
                inputElem._layerSwitcher = this.id;

                if (!baseLayer && !layer.inRange) {
                    inputElem.disabled = true;
                }

                // create span
                var labelSpan = document.createElement("label");
                // this isn't the DOM attribute 'for', but an arbitrary name we
                // use to find the appropriate input element in <onButtonClick>
                labelSpan["for"] = inputElem.id;
                OpenLayers.Element.addClass(labelSpan, "labelSpan olButton");
                labelSpan._layer = layer.id;
                labelSpan._layerSwitcher = this.id;
                if (!baseLayer && !layer.inRange) {
                    labelSpan.style.color = "gray";
                }
                labelSpan.innerHTML = layer.name;
                labelSpan.style.verticalAlign = (baseLayer) ? "bottom"
                                                            : "baseline";
                labelSpan.style.marginLeft="5px";
                
                // create infoSources
                var infoSources = document.createElement("img");
                //infoSources["for"] = inputElem.id;
                OpenLayers.Element.addClass(infoSources, "infoSources olButton");
                infoSources._layer = layer.id;
                infoSources._layerSwitcher = this.id;
                if (!baseLayer && !layer.inRange) {
                    infoSources.style.color = "gray";
                }
                //infoSources.innerHTML = 'ZoomTo';
                infoSources.src = 'theme/img/icons/information.png';
                infoSources.style.verticalAlign = (baseLayer) ? "bottom" 
                                                            : "baseline";
                infoSources.style.marginLeft = "5px";
                infoSources.style.cursor = "pointer";
                
                // create line break
                var br = document.createElement("br");
            
            // Custom layer info sources
            OpenLayers.Event.observe(infoSources, "mouseup",  
                OpenLayers.Function.bindAsEventListener( 
                    this.infoLayersSources, {layer: layer}));                        

                var groupArray = (baseLayer) ? this.baseLayers
                                             : this.dataLayers;
                groupArray.push({
                    'layer': layer,
                    'inputElem': inputElem,
                    'labelSpan': labelSpan,
                    'infoSources': infoSources
                });
                                                     
    
                /*var groupDiv = (baseLayer) ? this.baseLayersDiv
                                           : this.dataLayersDiv;
                groupDiv.appendChild(inputElem);
                groupDiv.appendChild(labelSpan);
                groupDiv.appendChild(br);*/
                var infoLayersSourcesOption = layer.infoLayersSources;
                // layer group for data layers  
                if (!baseLayer) { 
                    // no group 
                    if (layer.group == null)  { 
                        this.dataLayersDiv.appendChild(inputElem); 
                        infoLayersSourcesOption ? this.dataLayersDiv.appendChild(infoSources) : null;                         
                        this.dataLayersDiv.appendChild(labelSpan); 
                        this.dataLayersDiv.appendChild(br); 
                    } 
                    // group exists it is most probably allready there 
                    else { 
                        var groupname = layer.group; 
                        var div = this.groups.groupDivs[groupname]; 
                        div.appendChild(inputElem); 
                        infoLayersSourcesOption ? div.appendChild(infoSources) : null;                        
                        div.appendChild(labelSpan); 
                        div.appendChild(br); 
                        // append layer to the group 
                        this.appendLayerToGroups(layer); 
                    } 
                } 
                // base layers 
                else { 
                    this.baseLayersDiv.appendChild(inputElem); 
                    infoLayersSourcesOption ? this.baseLayersDiv.appendChild(infoSources) : null;                     
                    this.baseLayersDiv.appendChild(labelSpan); 
                    this.baseLayersDiv.appendChild(br); 
                } 
    
                if(layer.showLegendGraphic && layer.getLegendGraphicURLs && (layer.inRange || layer.isBaseLayer) && layer.getVisibility()){ 
                    var legendURLs = new Array;
                    legendURLs = layer.getLegendGraphicURLs(this.map.getScale()); 
                    if (legendURLs) { 
						
						// checking for format
						var lowerCaseURL = legendURLs[0].toLowerCase();
						if(lowerCaseURL.indexOf("format") != -1){
						    legendURLs[0] = legendURLs[0].replace(/format=[^&]+/i, 'format=image/png');							
						}
                        
						var legDiv = document.createElement("div");
                        legDiv.style.marginLeft="15px"; 
                        for (var p = 0;p<legendURLs.length;p++) 
                        { 
                            var legendImg = document.createElement("img"); 
                            
                            if (legendURLs[p].indexOf('gwc/service')){
                                legendURLs[p] = legendURLs[p].replace('gwc/service','');
                            }                            
                            
                            legendImg.src = legendURLs[p]; 
                            legDiv.appendChild(legendImg); 
                            legDiv.appendChild(document.createElement("br")); 
                        } 
                        var visible = layer.getVisibility();
                        if(visible){
                            if(layer.group == null){
                                this.dataLayersDiv.appendChild(legDiv); 
                            }else{
                                var groupname = layer.group; 
                                var div = this.groups.groupDivs[groupname];
                                div.appendChild(legDiv);
                            }
                        }
                    } 
                }   
            }
        }

        // if no overlays, dont display the overlay label
        this.dataLbl.style.display = (containsOverlays) ? "" : "none";

        // if no baselayers, dont display the baselayer label
        this.baseLbl.style.display = (containsBaseLayers) ? "" : "none";

        return this.div;
    },

    /**  
     * Method: 
     * A group label has been clicked, check or uncheck its corresponding input 
     *  
     * Parameters: 
     * e - {Event}  
     * 
     * Context:   
     *  - {DOMElement} inputElem 
     *  - {<OpenLayers.Control.LayerSwitcher>} layerSwitcher 
     *  - {DOMElement} groupDiv 
     */ 
 
    onInputGroupClick: function(e) { 
 
        // setup the check value 
        var check = !this.inputElem.checked; 
 
        // get all <input></input> tags in this div 
        var inputs = this.groupDiv.getElementsByTagName("input"); 
 
        // check the group input, other inputs are in groupDiv, 
        // inputElem is in parent div 
        this.inputElem.checked=check; 
 
        // store to groupCheckd structure, where it can be later found 
        this.layerSwitcher.groups.checked[this.inputElem.value] = check; 
 
        for (var i = 0; i < inputs.length; i++) { 
            // same as above 
            inputs[i].checked=check; 
            this.layerSwitcher.groups.checked[inputs[i].value] = check; 
        } 
 
        // groups are done, now the layers 
        var dataLayers = this.layerSwitcher.dataLayers; 
        for (var j = 0; j < dataLayers.length; j++) { 
            var layerEntry = dataLayers[j];    
            if (this.layerSwitcher.isInGroup( 
                    this.inputElem.value,layerEntry.layer.id)) { 
                layerEntry.inputElem.checked = check; 
                layerEntry.layer.setVisibility(check); 
            } 
        } 
 
        OpenLayers.Event.stop(e); 
    },

    /** 
     * Method: onGroupClick 
     * Make the div with layers invisible 
     *  
     * Context:  
     * layergroup - {String}  
     * groups - {Array} of {DOMElements} 
     */ 
    onGroupClick: function(e) { 
        var layergroup = this.layergroup; 
        var div = this.groups.groupDivs[layergroup]; 
        if (div) { 
            if (div.style.display != "block") { 
                div.style.display = "block"; 
                this.groups.display[layergroup] = "block"; 
            } 
            else { 
                div.style.display = "none"; 
                this.groups.display[layergroup] = "none"; 
            } 
        } 
    },  

    /**  
     * Method: createGroupDiv 
     * Creates <div></div> element for group of layers defined by input string. 
     *  
     * Parameters: 
     * layergroup - {Strin} with group structure as "Parent Group/It's child" 
     *   
     * Returns: 
     * {DOMElement} <div></div> object for this group of layers 
     */ 
    createGroupDiv: function(layergroup,layer) { 
        var groupNames = layergroup.split("/"); // array with layer names 
        var groupName = groupNames[groupNames.length-1]; // name of the last group in the line 
        var br = document.createElement("br");  
        var groupDiv = this.groups.groupDivs[layergroup]; 
         
        // groupDiv does not exist: create 
        if (!groupDiv) { 
 
            // search for the parent div - it can be another group div, or  
            // this dataLayersDiv directly 
            var parentDiv = this.groups.groupDivs[groupNames.slice(0,groupNames.length-2).join("/")]; 
 
            if (!parentDiv) { 
 
                // dataLayersDiv is parent div 
                if (groupNames.length == 1) { 
                    parentDiv = this.dataLayersDiv; 
                } 
                // there is no such thing, like parent div, 
                else { 
                    parentDiv = this.createGroupDiv( groupNames.slice(0,groupNames.length-1).join("/")); 
                } 
            } 
 
            // create the div 
            var groupDiv = document.createElement("div");
            OpenLayers.Element.addClass(groupDiv, "olLayerGroup " + groupName);
            //groupDiv.setAttribute('class','olLayerGroup');
            groupDiv.style.marginLeft="10px"; 
            groupDiv.style.marginBottom="5px"; 
            groupDiv.style.marginTop="5px";
            if (!this.groups.display[layergroup]) {
                if(layer){
                    if (layer.options.collapse){
                        this.groups.display[layergroup] = "none";
                    }else{
                        this.groups.display[layergroup] = "block";
                    }    
                }else{
                    this.groups.display[layergroup] = "block";
                }
            }
            /*if (!this.groups.display[layergroup]) { 
                this.groups.display[layergroup] = "block"; 
            }*/             
            groupDiv.style.display = this.groups.display[layergroup]; 
            this.groups.groupDivs[layergroup] = groupDiv; 
            
            var infoGroupsSourcesOption = layer.infoGroupsSources;
            
            if (infoGroupsSourcesOption){
            
                 // create infoGroups
                var infoGroups = document.createElement("img");
                //infoGroups["for"] = inputElem.id;
                OpenLayers.Element.addClass(infoGroups, "infoGroups olButton");
                infoGroups._layer = layer.id;
                infoGroups._layerSwitcher = this.id;

                //infoGroups.innerHTML = 'ZoomTo';
                infoGroups.src = 'theme/img/icons/information.png';
                infoGroups.title = "Source of Information";
                infoGroups.style.verticalAlign = "bottom";
                infoGroups.style.marginLeft = "5px";
                infoGroups.style.marginRight = "0px";
                infoGroups.style.cursor = "pointer";

                // setup mouse click event on groupLbl 
                OpenLayers.Event.observe(infoGroups, "mouseup",  
                    OpenLayers.Function.bindAsEventListener( 
                        this.infoGroupsSources, {layergroup: layergroup, groups: 
                        this.groups})); 
                        
            }
                    
            // create the label 
            var groupLbl = document.createElement("span"); 
            groupLbl.innerHTML="<u>"+groupName+"</u>";        
            groupLbl.style.marginTop = "3px"; 
            //groupLbl.style.marginLeft = "3px"; 
            groupLbl.style.marginBottom = "3px"; 
            groupLbl.style.fontWeight = "bold";
            groupLbl.style.cursor = "pointer";            
 
            // setup mouse click event on groupLbl 
            OpenLayers.Event.observe(groupLbl, "mouseup",  
                OpenLayers.Function.bindAsEventListener( 
                    this.onGroupClick, {layergroup: layergroup, groups: 
                    this.groups})); 

            var groupLbl_ = document.createElement("span"); 
            groupLbl_.innerHTML="<br/>";  
            
            // create input checkbox 
            /*var groupInput = document.createElement("input"); 
            groupInput.id = "input_" + groupNames.join("_"); 
            groupInput.name = groupNames.join("_"); 
            groupInput.type = "checkbox"; 
            groupInput.value = layergroup; 
            groupInput.checked = false; 
            groupInput.defaultChecked = false; 
            if (!this.groups.checked[layergroup]) { 
                this.groups.checked[layergroup] = false; 
            } 
            groupInput.checked = this.groups.checked[layergroup]; 
            groupInput.defaultChecked = this.groups.checked[layergroup];*/ 
 
            // create empty array of layers 
            if (!this.groups.layers[layergroup]) { 
                this.groups.layers[layergroup] = []; 
            } 
             
            // setup mouse click event on groupInput 
            /*var context = {groupDiv: groupDiv, 
                            layerSwitcher: this, 
                            inputElem: groupInput}; 
 
            OpenLayers.Event.observe(groupInput, "mouseup",  
                OpenLayers.Function.bindAsEventListener( 
                    this.onInputGroupClick, context));*/ 
             
            // append to parent div 
            /*parentDiv.appendChild(groupInput); */

            parentDiv.appendChild(groupLbl); 
            
            if (infoGroupsSourcesOption){
                parentDiv.appendChild(infoGroups);   
                parentDiv.appendChild(groupLbl_);
            }
                
            parentDiv.appendChild(groupDiv);            
 
        } 
 
        return this.groups.groupDivs[layergroup]; 
    }, 
 
    appendLayerToGroups: function(layer) { 
        var groupNames = layer.group.split("/"); 
        var groupName = null; 
 
        for (var i = 1; i <= groupNames.length; i++) { 
            var groupName = groupNames.slice(0,i).join("/"); 
            if (!this.isInGroup(groupName,layer.id)) { 
                this.groups.layers[groupName].push(layer); 
            } 
        } 
    }, 
     
    isInGroup: function (groupName, id) { 
        for (var j = 0; j < this.groups.layers[groupName].length; j++) { 
            if (this.groups.layers[groupName][j].id == id) { 
                return true; 
            } 
        } 
        return false; 
    },
    
    infoLayersSources: function(e){
            var l = this.layer;
            var info = l.infoLayersSources;
            FigisMap.infoSourceLayers(info);
    },
    
    infoGroupsSources: function(e){
            var g = this.groups.layers[this.layergroup][0];
            var info = g.infoGroupsSources;
            FigisMap.infoSourceLayers(info,false);
    }    
});