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
VMESearch.loader = function(){
	return new Ext.LoadMask(Ext.getBody(), {msg: "Please wait ..."});
}

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
	listeners: {
    /*
      click: 
/*      ,beforeclick: function(view,index,node,event){
        //if( window.console ) console.log('dataView.beforeclick(%o,%o,%o,%o)',view,index,node,event);
      }*/
    }
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
                    
                    
                    if(Ext.isIE){
                      VME.myMap.zoomOut(); 
                    }
                    
                    var settings = {
                      zoomExtent: bounds
		    };
                    
		    VME.zoomTo(settings,repro_bbox,zoom,false);
                    
		    //Note: use this to center the popup when the search panel is opened!!! but if do this we are problem on dateline (popup disappears)
                    //myMap.paddingForPopups.right = 240; 	
                    
                    //var year = selectedRecord.get("year");
                    var year = Ext.getCmp("id_selectYear").getValue() || rec_year;
		    FigisMap.time.setSelectedYear(year);
    
                    // start refresh legend
                    var nameRFB = jsonData.features[0].properties.OWNER;
                    VME.refreshLayers(nameRFB);
                                        
                    FigisMap.ol.clearPopupCache(); //TODO OL3
                    
                    if(!zoom){            
                        if(VME.getProjection() == "4326"){
                            FigisMap.ol.emulatePopupFromGeom(geom);
                        }else{
                            FigisMap.ol.emulatePopupFromGeom(repro_geom);
                        }
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
                VMESearch.search(true);
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
 * VMESearch.search
 * Search VMEs zooming to the VME autority area.
 * 
 */
VMESearch.search = function(advanced){

	var vmeLoader = VMESearch.loader();

	// ///////////////////////////////////////////////////
	// Retrieve Autority area extent to perform a VME.zoomTo.
	// ///////////////////////////////////////////////////
	
	var RFMOCombo = Ext.getCmp("RFMOCombo");
	var RFMStore = RFMOCombo.getStore();
	var value = RFMOCombo.getValue();
    
	FigisMap.ol.clearPopupCache(); //TODO OL3

	//remove highlight layer if any
	VMESearch.resetHighlightVMELayer();	        
        
	var dIndex = RFMStore.find("id", value); 
    	
	if(dIndex > -1){
        var rfbCheckboxValue = Ext.getCmp(value+"_RFB").acronym;
        VME.setRFBCheckBoxValue(rfbCheckboxValue);

		var r = RFMStore.getAt(dIndex);	
		var rfbName = r.data.acronym;
		
		VME.refreshLayers(rfbName);

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
				vmeLoader.hide();
						
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
						areaType1.push({bounds:features[i].getProperties().bbox})
				}else if(features[i].getProperties().AREATYPE == 2){
						areaType2.push({bounds:features[i].getProperties().bbox})
				}
			}

			var size = areaType2.length == 0 ? areaType1.length : areaType2.length;
			var bounds = areaType2.length == 0 ? areaType1[0].bounds : areaType2[0].bounds;

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
		
			var fixedZoomTo = VMESearch.rfbZooms[features[0].getProperties().RFB]
		
			// ZOOM TO WRAPDATELINE FEATURES
			bounds = fixedZoomTo ? fixedZoomTo.zoomExtent : [left, bottom, right, top];
			var defaultProj = VME.getProjection();
			var mapProj = VME.myMap.getView().getProjection();
		
			var repro_bbox = ol.proj.transformExtent(bounds,
					new ol.proj.get("EPSG:4326"),
					mapProj
					//defaultProj == "3031" ? new OpenLayers.Projection("EPSG:4326") : mapProj //use this if default map projection is 4326);
			);
			var settings = { zoomExtent: bounds };
				
			// ////////////////////////////////////////////////////
			// Chek if 'CCAMLR' is selected in order to perform 
			// a reproject the map in 3031.
			// /////////////////////////////////////////////////////
			
			var RFMOCombo = Ext.getCmp("RFMOCombo");
			var RFMOValue = RFMOCombo.getValue();
			var RFMOComboStore = RFMOCombo.getStore();
			var RFMORecord = RFMOComboStore.getAt(RFMOComboStore.find('acronym', "CCAMLR"));
			var RFMOId = RFMORecord.get('id');

			if (fixedZoomTo && fixedZoomTo.isWrapDateLine){
				var newLeft = repro_bbox[2];
				var newRight = repro_bbox[0];
				repro_bbox[0] = newLeft;
				repro_bbox[2] = newRight;
			}
			
			if(RFMOValue == RFMOId){
				settings.srs = "EPSG:3031";
				VME.zoomTo(settings, repro_bbox, false, true);
			}else{
				VME.zoomTo(settings, repro_bbox, true, true);
			}			
		   
		}
		vmeSearch(advanced);
		vmeLoader.hide();
		
		vectorSource.on("change", function(e){
			loadFeaturesCallback();
		});
	
		vectorSource.loadFeatures();
	}
	
	
};

function vmeSearch(advanced){
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
 * VMESearch.rfbZoomTo
 * Zooming to the RFB areas.
 * @param acronym
 */
VMESearch.rfbZoomTo = function(acronym){

	var vmeLoader = VMESearch.loader();

	////////////////////////////////////////////////////
	// Retrieve RFB areas extent to perform a VME.zoomTo. //
	////////////////////////////////////////////////////
    	var rfbName = acronym;
    
   	// perform CQL_FILTER
    	VME.refreshLayers(rfbName);

    	FigisMap.ol.clearPopupCache();   //TODO OL3  

	//remove highlight layer if any
	VMESearch.resetHighlightVMELayer();	   
    
	//vector source
	var layer = "fifao:RFB_COMP_CLIP";
	var sourceUrl = FigisMap.rnd.vars.wfs + layer;
	var cqlFilter = "RFB=" + "'" + rfbName + "'";
    	var vectorSource = FigisMap.rnd.configureVectorSource(sourceUrl, cqlFilter);
	
	var loadFeaturesCallback = function(){	
		
		var features = vectorSource.getFeatures();
		if(!features || features.length < 1){
			vmeLoader.hide();
			
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
				areaType1.push({bounds:features[i].getProperties().bbox})
			}else if(features[i].getProperties().AREATYPE == 2){
				areaType2.push({bounds:features[i].getProperties().bbox})
			}
		}

		var size = areaType2.length == 0 ? areaType1.length : areaType2.length;
		var bounds = areaType2.length == 0 ? areaType1[0].bounds : areaType2[0].bounds;
		
		var left = bounds[0];
		var bottom = bounds[1];
		var right = bounds[2];
		var top = bounds[3];
		
		for(var i=0; i<size; i++){
			var b = areaType2.length == 0 ? areaType1[i].bounds : areaType2[i].bounds;
			if(!b){
				continue;
			}
			
			/*if(bounds && b.contains(bounds)){
				bounds = b;
			}*/

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

		var fixedZoomTo = VMESearch.rfbZooms[features[0].getProperties().RFB]
		
		// ZOOM TO WRAPDATELINE FEATURES
		bounds = fixedZoomTo ? fixedZoomTo.zoomExtent : [left, bottom, right, top];
		var defaultProj = VME.getProjection();
		var mapProj = VME.myMap.getView().getProjection();
		
		var repro_bbox = ol.proj.transformExtent(bounds,
			new ol.proj.get("EPSG:4326"),
			mapProj
			//defaultProj == "3031" ? new OpenLayers.Projection("EPSG:4326") : mapProj //use this if default map projection is 4326
			);
		var settings = {
			zoomExtent: bounds
		};
			
		// ZOOM TO WRAPDATELINE FEATURES
		if (fixedZoomTo && fixedZoomTo.isWrapDateLine){
			newLeft = repro_bbox[2];
			newRight = repro_bbox[0];
			repro_bbox[0] = newLeft;
			repro_bbox[2] = newRight;
		}	
			
		// ////////////////////////////////////////////////////
		// Chek if 'CCAMLR' is selected in order to perform 
		// a reproject the map in 3031.
		// /////////////////////////////////////////////////////
			
		var RFBValue = features[0].getProperties().RFB;            
		var RFBComboStore = VMEData.stores.rfmoStore;
		var RFBRecord = RFBComboStore.getAt(RFBComboStore.find('acronym', "CCAMLR"));
		var RFBId = RFBRecord.get('acronym');
		if(RFBValue == RFBId){
			settings.srs = "EPSG:3031";
			VME.zoomTo(settings, repro_bbox, false, true);
		}else{
			VME.zoomTo(settings, repro_bbox, true, true);
		}			
			
		vmeLoader.hide();
	}
	
	vectorSource.on("change", function(e){
		loadFeaturesCallback();
	});
	
	vectorSource.loadFeatures();
};

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
                        VMESearch.rfbZoomTo(radio.acronym);
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
