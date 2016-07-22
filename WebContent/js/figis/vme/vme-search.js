/*
	vme-search.js
	Search module for VME using Extjs
	Authors:
		Lorenzo Natali. Geo-Solutions
		Emmanuel Blondel. FAO - Modification to integration with FigisMap OL3
	
	Status: Beta.	
*/

VMESearch = new Object();



// FIXED ZOOM TO FOR SOME RFB TYPE (ZOOM TO WRAPDATELINE FEATURES)
/**
 * VMESearch.rfbZooms constants
 * Used to fix zoom extent for some RFBs (zoom to wrapdateLine features)
 */
VMESearch.rfbZooms = {
    	SPRFMO : {isWrapDateLine: true, zoomExtent: [-50, -60, 100, 10]},
    	NPFC : {isWrapDateLine: true, zoomExtent: [-55, 15, 75, 55]},
	NEAFC : {isWrapDateLine: false, zoomExtent: [-78.93, 32.38, 82.77, 77.23]},
	NAFO : {isWrapDateLine: false, zoomExtent: [-121.75710936669134, 13.121674445496733, 25.899140612752504, 68.12634423147448]}
}


/**
 * VMESearch.loader widget
 */
VMESearch.loader = {};
VMESearch.initLoader = function(){
	VMESearch.loader = new Ext.LoadMask(Ext.getBody(), {msg: "Please wait ..."});
	VMESearch.loader.disable();
}
VMESearch.initLoader();

VMESearch.form={
	panels:{},
	widgets:{}
		
};

// store Factsheet URL for popup
VMESearch.factsheetUrl={};

/**
 * VMESearch.form.widgets.SearchResults
 * Data view for search results. uses SearchResultStore and searchResult template
 */
VMESearch.form.widgets.SearchResults = new Ext.DataView({
	store: VMEData.stores.SearchResultStore,
	tpl: VMEData.templates.searchResult,
	pageSize:VMEData.constants.pageSize,
	singleSelect: true,
	//height:440,
	autoScroll:true,
	//multiSelect: true,
	itemSelector:'div.search-result',
	itemCls: 'x-view-item',
	overClass:'x-view-over',
	selectedClass: 'x-view-selected',
	emptyText: '<div style="color:white;">' + VME.label('SEARCH_NO_RES') + '</div>',
	loadingText:'<div style="color:white;">' + VME.label('SEARCH_LOADING') + '</div>',
	listeners: {}
});

/**
 * VMESearch.configureHighlightVMESource configures a source for Highlight VME layer
 * @param feature object of class {ol.Feature}
 * @return an object of class {ol.source.Vector}
 */
VMESearch.configureHighlightVMESource = function(feature){
	var vectorSource = new ol.source.Vector({});
	if(feature) vectorSource.addFeature(feature);
	return vectorSource;
}


/**
 * VMESearch.addHighlightVMELayer adds highlight VME layer 
 * @param source object of class {ol.source.Vector}
 */
VMESearch.addHighlightVMELayer = function(source){

	//configure and add vector layer
	FigisMap.rnd.addVectorLayer(VME.myMap, VME.myMap.getLayers().getArray()[2],{
		id: "highlight",
		title: undefined, //implicit way to hide in layerswitcher
		source: source,
		style: new ol.style.Style({
			fill: new ol.style.Fill({
      				color: "rgba(238,153,0,0)"
      			}),
      			stroke: new ol.style.Stroke({
        			color: '#ee9900',
      				width: 2
      			})
		})	
	});
	
}


/**
 * VMESearch.removeHighlightVMELayer resets highlight vector layer
 */
VMESearch.resetHighlightVMELayer = function(){
	var highlightLayer = FigisMap.ol.getLayer(VME.myMap, "highlight", by = "id");
	if(highlightLayer){			
		var emptySource = VMESearch.configureHighlightVMESource();
		highlightLayer.setSource(emptySource);
	}
}


/**
* clickOnResult
*/
VMESearch.clickOnFeature =function(geographicFeatureId,rec_year,zoom){

	//remove highlight layer if any
	VMESearch.resetHighlightVMELayer();

        var typename = FigisMap.fifao.vme;
        var CQL_FILTER = "VME_AREA_TIME = '"+geographicFeatureId+"'";

        Ext.Ajax.request({
            url : FigisMap.rnd.vars.ows,
            method: 'GET',
            params :{
                service:'WFS',
                version:'1.0.0',
                request:'GetFeature',
                typename: typename,
                cql_filter: CQL_FILTER,
                outputFormat:'json'
            },
            success: function ( result, request ) {
                var jsonData = Ext.util.JSON.decode(result.responseText);
                
                if (!jsonData.features || jsonData.features.length <= 0 || !jsonData.features[0].geometry){
                    Ext.MessageBox.show({
                        title: "Info",
                        msg: VME.label("SIDP_NOGEOMETRY"),
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.INFO,
                        scope: this
                    });  
                }else{

		    //grab geojson geomtry
                    var geoJsonGeom = jsonData.features[0].geometry;
                    

		    //configure vector source from geometry
		    var GeoJsonFormat = new ol.format.GeoJSON()
                    var geom = GeoJsonFormat.readGeometry(geoJsonGeom);
		    
        	    var repro_geom = geom.transform(
                        new ol.proj.get("EPSG:4326"),
                        VME.myMap.getView().getProjection()
                    );
		    var sfProps = jsonData.features[0];
		    sfProps.geometry = repro_geom;
		    var sf = new ol.Feature(sfProps);
		    var vectorSource = VMESearch.configureHighlightVMESource(sf);
		    //configure highlight VME layer if not yet existing
 		    var highlightLayer = FigisMap.ol.getLayer(VME.myMap, "highlight", by = "id");
		    if(highlightLayer){
			//update existing 'Highlight' VME layer
			highlightLayer.setSource(vectorSource);
		    }else{
			//instantiate 'Highlight' VME layer
			VMESearch.addHighlightVMELayer(vectorSource);
		    }			

                    var bounds = geom.getExtent();
                    var repro_bbox = repro_geom.getExtent();
                    
                    
                    /*if(Ext.isIE){
                      VME.myMap.zoomOut(); 
                    }*/
                    
                    //zoom
		    VME.zoomTo(repro_bbox, null, VME.myMap.getView().getProjection(), VME.myMap.getView().getProjection());
                    
                    var year = Ext.getCmp("id_selectYear").getValue() || rec_year;
		    FigisMap.time.setSelectedYear(year);
    
                    // start refresh legend
                    var nameRFB = jsonData.features[0].properties.OWNER;
                    VME.refreshLayers(nameRFB);
                                        
                    VMEPopup.remove();
                    
                    if(!zoom){ 
			var coords = (VME.getProjection() == "4326")? ol.extent.getCenter(bounds) : ol.extent.getCenter(repro_bbox);          
                        FigisMap.rnd.emulatePopupForCoordinates(VME.myMap, "vmelayers", coords);
                    }
                }
          
            },
            failure: function ( result, request ) {
                Ext.MessageBox.show({
                    title: "Info",
                    msg: VME.label("SIDP_NOGEOMETRY"),
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.INFO,
                    scope: this
                });  
            },
            scope: this
        });
		
      };

/**
 * VMESearch.form.panels.SearchForm
 * form to perform searches on Vme search services (now to WFS) 
 * 
 */
VMESearch.form.panels.SearchForm = new Ext.FormPanel({
	labelWidth: 75, // label settings here cascade unless overridden

	bodyStyle:'padding:5px 5px 0',
	border: false,
	labelAlign :'top',
	defaults: {
	    anchor:'100%',
        shadow:false
    },
	defaultType: 'combo',
    id:'SearchForm',
	items: [
		/*{
			fieldLabel: VME.label("SEARCH_TEXT_LBL"),
			xtype: 'textfield',
			name : 'text',
			ref:'../text',
			emptyText: VME.label("SEARCH_TEXT_EMP")
		},*/{
			fieldLabel: VME.label('SEARCH_RFMO_LBL'),//+' [<a href="#">?</a>]',
			name: 'authority',
			ref:'../RFMO',
			id: "RFMOCombo",
			emptyText:  VME.label('SEARCH_RFMO_EMP'),
			store: VMEData.stores.rfmoStore,
			allowBlank:true,
			forceSelection:true,
			triggerAction: 'all',
			mode: 'local',
            valueField : 'id',
			displayField: 'acronym'
		},{
			fieldLabel: VME.label('SEARCH_TYPE_LBL'),//+' [<a href="#">?</a>]',
			name: 'vme_type',
			ref: '../AreaType',
			emptyText:  VME.label('SEARCH_TYPE_EMP'),
            value:   VME.label('SEARCH_TYPE_EMP'),            
			allowBlank:true,
			forceSelection:true,
			triggerAction: 'all',
			mode: 'local',
			store:  VMEData.stores.areaTypeStore,
			valueField : 'id',
			displayField: 'displayText',
			listAlign: ['tr-br?', [17,0]],
			listeners:{
			    expand:{
			        single:true,
			        fn: function( comboBox ){
                          comboBox.list.setWidth( 'auto' );
                          comboBox.innerList.setWidth( 'auto' );
                        }
			    }
			}
		},
		{
			fieldLabel: VME.label('SEARCH_YEAR_LBL'),//+'[<a href="#">?</a>]',
			id: "id_selectYear",
			name: 'year',
			ref:'../year', 
			emptyText: VME.label('SEARCH_YEAR_EMP'),
			allowBlank:true,
			forceSelection:true,
			typeAhead: true,
			triggerAction: 'all',
			mode: 'local',
			store:  VMEData.stores.yearStore,
			displayField: 'id',
            valueField: 'id'
		}
	],

	buttons: [{
			text: VME.label('SIDP_CLEAR'),
			ref: '../Clear',
			cls:'figisButton',
			handler: function(){
				VMESearch.form.panels.SearchForm.getForm().reset();
				document.getElementById('searchtext').value = "";
			}
			
		},{
			text: VME.label('SIDP_SEARCH'),
			ref: '../Search',
			cls: 'figisButton',
			
			handler: function(){
                		VMESearch.run(null, true, true);
            		}
		}
	],
    listeners: {
        afterRender: function(thisForm, options){
            this.keyNav = new Ext.KeyNav( this.el, {                  
                "enter": this.Search.handler,
                scope: this
            });
        }
    } 
});


/**
 * VMESearch.RFBCache
 * Navigation RFB bounds cache for faster switching of RFB and projection
 */
VMESearch.RFBCache = {};

/**
 * VMESearch.getRFBInCache
 * Retrieves bounds eventually cached given an RFB and a projection
 * @param rfb
 * @param proj epsg code string e.g. "EPSG:4326"
 * @return an array giving the bounds
 */
VMESearch.getRFBInCache = function(rfb, proj){
	var bounds = undefined;
	if(VMESearch.RFBCache[rfb]){
		if(proj){
			var cache = VMESearch.RFBCache[rfb][proj];	
			if(cache) bounds = cache;
		}
	}
	return bounds;
}

/**
 * VMESearch.setRFBInCache
 * Set bounds in cache given an RFB and a projection
 * @param rfb
 * @param proj epsg code string e.g. "EPSG:4326"
 * @param an array giving the bounds
 */
VMESearch.setRFBInCache = function(rfb, proj, bounds){
	if(!VMESearch.RFBCache[rfb]) VMESearch.RFBCache[rfb] = new Object();
	if(proj){
		if(!VMESearch.RFBCache[rfb][proj]) VMESearch.RFBCache[rfb][proj] = bounds;
	}
}


/**
 * VMESearch.run
 * Search VMEs zooming to the VME autority area.
 * @param value acronym of the RFMO
 * @param search true if search should be performed, false otherwise
 * @param advanced true to perform advanced search, false otherwise
 * @param targetProj target projection to force reprojection
 * 
 */
VMESearch.run = function(value, search, advanced, targetProj){

	//start loader
	if(VMESearch.loader.disabled){
		VMESearch.loader.enable();
		VMESearch.loader.show();
	}

	// ///////////////////////////////////////////////////
	// Retrieve Autority area extent to perform a VME.zoomTo.
	// ///////////////////////////////////////////////////
	
	if(!value){
		//if no value, try to retrieve value from RFMOCombo (advanced search)
		var RFMOCombo = Ext.getCmp("RFMOCombo");
		var RFMStore = RFMOCombo.getStore();
		var rfbId = RFMOCombo.getValue();
		var dIndex = RFMStore.find("id", rfbId); 
		if(dIndex > -1){
        		var rfbCheckboxValue = Ext.getCmp(rfbId+"_RFB").acronym;
        		VME.setRFBCheckBoxValue(rfbCheckboxValue);
			var r = RFMStore.getAt(dIndex);	
			value = r.data.acronym;
		}
	}

	if(value){

		//cases:
		//- zoom to Authority area without advanced search
		//- zoom to Authority with advanced search
		
		var rfbName = value;
		VME.setRFB(rfbName);
	
		//layout actions
		VMEPopup.remove();
		VMESearch.resetHighlightVMELayer();
		VME.refreshLayers(rfbName);

		//projs
		var sourceProj = VME.myMap.getView().getProjection();
		if(!targetProj){
			targetProj = (rfbName === "CCAMLR")? ol.proj.get("EPSG:3031") : ((sourceProj.getCode() == "EPSG:3031")? ol.proj.get("EPSG:900913") : sourceProj);
		}

		//look to cache, if not in cache perform a WFS request otherwise we take bounds from cache  
		var inCache = VMESearch.getRFBInCache(rfbName, targetProj.getCode());

		if(!inCache){
			console.log("Bounds for '"+rfbName+"' in proj "+targetProj.getCode()+" not in cache - Performing WFS request");
			
			//vector source
			var layer = "fifao:RFB_COMP_CLIP";
			var sourceUrl = FigisMap.rnd.vars.wfs + layer;
			var cqlFilter = "RFB=" + "'" + rfbName + "'";
			var vectorSource = FigisMap.rnd.configureVectorSource(sourceUrl, cqlFilter);
			vectorSource.loadFeatures();
			
			//loadFeatures callback
			var loadFeaturesCallback = function(){		
				var features = vectorSource.getFeatures();
				if(!features || features.length < 1){
					if(!VMESearch.loader.disabled){
						VMESearch.loader.hide();
						VMESearch.loader.disable();
					}
						
					Ext.MessageBox.show({
						title: "Info",
							msg: VME.label("SIDP_NOFEATURES"),
							buttons: Ext.Msg.OK,
						icon: Ext.MessageBox.WARNING,
						scope: this
					});
					return;
				}
						
				// ///////////////////////////
				// Get the bigger extent
				// ///////////////////////////			
					
		   		//CHECK IF AREATYPE IS 1 OR 2 FOR NAFO AND NEAFC    
				var areaType1 = new Array();
				var areaType2 = new Array();
				
				for (var i = 0;i<features.length;i++){
					if (features[i].getProperties().AREATYPE == 1){
							areaType1.push({bounds:features[i].getGeometry().getExtent()})
					}else if(features[i].getProperties().AREATYPE == 2){
							areaType2.push({bounds:features[i].getGeometry().getExtent()})
					}
				}

				var size = areaType2.length == 0 ? areaType1.length : areaType2.length;
				bounds = areaType2.length == 0 ? areaType1[0].bounds : areaType2[0].bounds;

				var left = bounds[0];
				var bottom = bounds[1];
				var right = bounds[2];
				var top = bounds[3];
					
				
				for(var i=0; i<size; i++){
					var b = areaType2.length == 0 ? areaType1[i].bounds : areaType2[i].bounds;
					if(!b){
						continue;
					}

					if(b.bottom < bottom){
						bottom = b.bottom;
					}
				
					if(b.left < left){
						left = b.left
					}
					
					if(b.right > right){
						right = b.right;
					}
				
					if(b.top > top){
						top = b.top
					}
				}
				
				// WORKOROUND TO FIX STRANGE BEHAVIOR WHEN XMAX = 90 IN COORDINATE TRANSFORMATION TO GOOGLE MERCATOR
				top = (top > 85 && top <= 92) ? 85 : top;
				
				//case of fixed zoom extents
				var fixedZoomTo = VMESearch.rfbZooms[rfbName];
				bounds = fixedZoomTo ? fixedZoomTo.zoomExtent : [left, bottom, right, top];
				
				
				//add to cache for next time
				console.log("Caching bounds for '"+rfbName+"' in proj 'EPSG:4326'");
				if(!VMESearch.getRFBInCache(rfbName, "EPSG:4326")) VMESearch.setRFBInCache(rfbName, "EPSG:4326", bounds);

				console.log("Caching bounds for '"+rfbName+"' in proj '"+targetProj.getCode()+"'");
				if(targetProj.getCode() != "EPSG:4326") bounds = ol.proj.transformExtent(bounds, ol.proj.get("EPSG:4326"), targetProj);
				VMESearch.setRFBInCache(rfbName, targetProj.getCode(), bounds);

				//perform zooming
				VMESearch.runZoom(rfbName, bounds, sourceProj, targetProj);
				

				//search
				if(search) VMESearch.performSearch(advanced);
			
				//end loader
				if(!VMESearch.loader.disabled){
					VMESearch.loader.hide();
					VMESearch.loader.disable();
				}
			
		   
			}
		
		
			vectorSource.on("change", function(e){
				loadFeaturesCallback();
			});
	
			vectorSource.loadFeatures();

		}else{
			console.log("Bounds for '"+rfbName+"' in proj "+targetProj.getCode()+" in cache - Use it!");
			VMESearch.runZoom(rfbName, inCache, sourceProj, targetProj);

		}

	}else{
		//cases:
		//- free text search
		//- advanced search without RFMO selection
		if(search) VMESearch.performSearch(advanced);
		
	}

	//end loader
	if(!VMESearch.loader.disabled){
		VMESearch.loader.hide();
		VMESearch.loader.disable();
	}
	
};


/**
 * VMESearch.runZoom
 * Function to be called from VMESearch.run, either after grabbing RFB bounds by WFS, or from cache
 * @param rfbName
 * @param zoomExtent
 * @param sourceProj
 * @param targetProj
 */
VMESearch.runZoom = function(rfbName, zoomExtent, sourceProj, targetProj){

	var wrapDateLine = false;
	var fixedZoomTo = VMESearch.rfbZooms[rfbName];
	if(fixedZoomTo && fixedZoomTo.isWrapDateLine) wrapDateLine = true;	
	var zoomLevel = VME.getRFBZoomLevel(rfbName, targetProj);
	VME.zoomTo(zoomExtent, zoomLevel, sourceProj, targetProj, wrapDateLine);
}


/**
 * VMESearch.performSearch
 * Runs search operation on Web-services
 * @param advanced true if advanced search (using the form) is performed, false otherwise
 *
 */
VMESearch.performSearch = function(advanced){
	// ///////////////////
	// Perform search
	// ///////////////////
	var store = VMEData.stores.SearchResultStore;
	store.resetTotal();
	store.removeAll();
	store.baseParams={};
	var fields = {};
	if(advanced){
		var fields = VMESearch.form.panels.SearchForm.getForm().getFieldValues(true);
	}
	fields.text = document.getElementById('searchtext').value;
	var params = {
		start: 0,          
		rows: VMEData.constants.pageSize
	};
	
	for (var key in fields){
		if(fields[key]!=""){
			switch(key){
				case 'authority':
				case 'vme_type':
				//case 'vme_criteria':
				case 'year':
				case 'text':
					store.setBaseParam(key, fields[key]);
					break;
				default:
					break;
			}
		}
	}
	
	store.load({
		params: params
	});
	
	VMESearch.form.panels.SearchPanel.layout.setActiveItem('resultPanel');
}




/** 
 * VMESearch.form.panels.SearchPanel
 * panel containing search form and search results dataview using
 * card layout. Wraps the previous components to complete search GUI
 *
 */
VMESearch.form.panels.SearchPanel = new Ext.Panel({
	
	layout:'card',
	activeItem: 0,
	
	border: false,
	defaults: {
		border:false
	},
	items:[{
			id: 'searchForm',
			xtype:'panel',
            border: false,
			defaults: {
				border:false
			},
			items:[VMESearch.form.panels.SearchForm]
		},{
			id: 'resultPanel',
			xtype:'panel',
			defaults: {
				border:false
			},
			items:[
				{
                    height:460,
                    border: false,
					xtype:'panel',
                    layout:'fit',
					items:[VMESearch.form.widgets.SearchResults],
					bbar : new Ext.ux.LazyPagingToolbar({
							store: VMEData.stores.SearchResultStore,
							pageSize: VMEData.constants.pageSize
					})	
			}],
			bbar:[{
				xtype: 'button',
				text: VME.label('SEARCH_BACK_FORM'),
				iconCls: 'back-search-icon',
				handler: function(){VMESearch.form.panels.SearchPanel.layout.setActiveItem('searchForm');}
			}]
		}
	]
		
});


var sidePanel = new Ext.Panel({
	//applyTo: 'side-bar',
	//renderTo:'sidebar',
    collapsed:true,
    collapsible:false,
	height:460,	
	activeItem: 0,
    layout:'card',
	id: "side-panel",
	deferredRender:false,
	border:false,
	defaults:{
		border:false
	},
	items:[
		{
			xtype: "form",
			id: "embed-link",
			bodyStyle: 'padding:5px 5px 0',
			border: false,
			labelAlign :'top',
			defaults: {
				anchor: '100%',
				shadow: false
			},
			items:[
				{
					xtype: "textfield",
					id: "embed-url",
					selectOnFocus: true,
					fieldLabel: "Paste the link in mail or chat"					
				},
				{
					xtype: "label",
					text: "Paste the HTML in a web site",
					style:{
						font: "bold 12px tahoma, arial, helvetica, sans-serif"
					}
				},
				{
					xtype: "textfield",
					id: "embed-iframe",
					selectOnFocus: true,
					fieldLabel: "Regular size"					
				},
				{
					xtype: "textfield",
					id: "embed-iframe-small",
					selectOnFocus: true,
					fieldLabel: "Small size"					
				}
			]
		},
		{
            id: 'legendPanel',
			layout:'fit',
			//title:VME.label('SIDP_MAP'),
			//iconCls:'map-icon',			
			renderHidden:true,
			defaults:{
				border:false
			},
			items:[{	
				id:'layerswitcherpanel',
				//title:VME.label('SIDP_LAYERS'),
				iconCls: 'layers-icon',
				autoScroll: true,
				html:'<div id="layerswitcher"></div>'
			
			}]
		},
		{
            id: 'searchPanel',
			//title:VME.label('SIDP_SEARCH'),
			iconCls: 'search-icon',
			items:[VMESearch.form.panels.SearchPanel]
		}
		
	]

});

var selectRFB = new Ext.Panel({
    layout: 'form',
    renderTo: 'RFBCombo_',
    name: 'selectRFB_name',
	border: false,
	labelAlign :'left',
	defaults: {
	    anchor:'100%',
        shadow:false
    },
    id:'selectRFB'
});
 

VMEData.stores.rfmoStore.on('load',function(store, records, options){
    
    var items = [];
    
    for (var i = 0;i<2;i++){
        items.push({items: []});
    }
    
    var panel = Ext.getCmp("selectRFB");
    
    panel.add({
        xtype: 'radiogroup', 
        name: 'selectRFBcombo',
        ref:'../RFBcombo',
        border: false,
        id: "RFBCombo",   
        hideLabel: true,
        columns: 2,
        vertical: true,
        items:items         
    });
    
    panel.doLayout(false,true);        
    
    store.each(function(records,count,tot) {
        var column;
        if(count==0 || count<4){
            column = Ext.getCmp("RFBCombo").panel.getComponent(0);
            column.setWidth(90);
        }else if(count==4 || count<8){
            column = Ext.getCmp("RFBCombo").panel.getComponent(1);  
            column.setWidth(90);
        }else{
            column = Ext.getCmp("RFBCombo").panel.getComponent(2);  
            column.setWidth(90);
        }
        var radio = column.add({
            xtype: 'radio',
            width: 'auto',
            id: records.data.id + '_RFB',
            boxLabel: '<a id="infoRFBimage_'+records.data.id+'_RFB'+'" style="color:#000000"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="assets/figis/vme/img/icons/information.png">'+records.data.acronym+'</a>',
            name: 'rfb',
            acronym: records.data.acronym,
            inputValue: records.data.id,
            listeners: {
                check: function(radio, checked){
                    if(checked){
                        VMESearch.run(radio.acronym, false);
                        sidePanel.layout.setActiveItem('legendPanel');
                        sidePanel.expand();  
                    }
                },
                afterrender: function(radio){               
                    
                    //var rfbStore = 'rfbStore' + radio.acronym;      
                    Ext.Ajax.request({
                        url: FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/"+radio.acronym+"/scope/Regulatory/vmes",
                        headers: {"Accept": "application/json", 'Content-Type': 'application/json;charset=utf-8'},
                        success: function(response) {
                                var json = Ext.decode(response.responseText);
                                VMESearch.factsheetUrl[radio.acronym] = json.resultList[0].factsheetUrl;
                                var id = 'infoRFBimage_' + radio.id;
                                Ext.get(id).dom.lastChild.parentNode.outerHTML = '<a id="'+id+'" style="color:#000000" href="javascript:void(0);" //onClick="VMEInfo.infoHandler(\''+json.resultList[0].factsheetUrl+'\',true);"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="assets/figis/vme/img/icons/information.png"></a><span>'+radio.acronym+'</span>';
                        }
                    });

                }
            }
        });
        column.items.add(radio);  
        column.doLayout(false,true);
    });
    
    if ( location.search.indexOf("embed=true") != -1 ){
        var rfb;
        var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
        
        for (var j=0; j < params.length; j++) {
            var param = params[j].split("=");
            switch ( param[0] ) {
                case "rfb"	: rfb = param[1]; break;
            }
        }
        
        if ( rfb && rfb != '' && typeof(rfb) != 'undefined' && rfb != 'undefined'){
            VME.setRFBCheckBoxValue(rfb);
        }        
    }

});

//REMOVE WHEN GFCM AND WECAFC WEB-SERVICE WILL UP
VMESearch.msgAlert = function (acronym){
    Ext.Msg.alert("MESSAGE", "WEB-SERVICE: "+acronym+" IS DOWN");
};
