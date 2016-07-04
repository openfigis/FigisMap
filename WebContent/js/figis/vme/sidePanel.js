/*
	side-panel.js
	Search module for VME using Extjs
	Authors: Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/

Vme.form={
	panels:{},
	widgets:{}
		
};

// store Factsheet URL for popup
Vme.factsheetUrl={};

/**
 * Vme.form.widgets.SearchResults
 * Data view for search results. uses SearchResultStore and searchResult template
 */
Vme.form.widgets.SearchResults = new Ext.DataView({
	store: Vme.data.stores.SearchResultStore,
	tpl: Vme.data.templates.searchResult,
	pageSize:Vme.data.constants.pageSize,
	singleSelect: true,
	//height:440,
	autoScroll:true,
	//multiSelect: true,
	itemSelector:'div.search-result',
	itemCls: 'x-view-item',
	overClass:'x-view-over',
	selectedClass: 'x-view-selected',
	emptyText: '<div style="color:white;">' + FigisMap.label('SEARCH_NO_RES') + '</div>',
	loadingText:'<div style="color:white;">' + FigisMap.label('SEARCH_LOADING') + '</div>',
	listeners: {
    /*
      click: 
/*      ,beforeclick: function(view,index,node,event){
        //if( window.console ) console.log('dataView.beforeclick(%o,%o,%o,%o)',view,index,node,event);
      }*/
    }
});
/**
* clickOnResult
*/
Vme.clickOnFeature =function(geographicFeatureId,rec_year,zoom){
          
        //if( window.console ) console.log('dataView.click(%o,%o,%o,%o)',view,index,node,event);
		//var selectedRecord =this.store.getAt(index);
		var layer = myMap.getLayersByName("highlight")[0];
		//create layer
		if(layer){
			myMap.removeLayer(layer,false);
		}	

        var vmeId = 103; //selectedRecord.get("vmeId");
        //var geographicFeatureId = selectedRecord.get("geographicFeatureId");
        // vecchi parametri
        var layerName = FigisMap.fifao.vme_cl.split(':',2)[1];
        var featureid = layerName+'.'+vmeId;
        //nuovi parametri
        var typename = FigisMap.fifao.vme_cl;
        var CQL_FILTER = "VME_AREA_TIME = '"+geographicFeatureId+"'";

        Ext.Ajax.request({
            url : FigisMap.rnd.vars.ows,
            method: 'GET',
            params :{
                service:'WFS',
                version:'1.0.0',
                request:'GetFeature',
                //featureid: featureid,
                typename: typename,
                cql_filter: CQL_FILTER,
                outputFormat:'json'
            },
            success: function ( result, request ) {
                var jsonData = Ext.util.JSON.decode(result.responseText);
                
                if (!jsonData.features || jsonData.features.length <= 0 || !jsonData.features[0].geometry){
                    Ext.MessageBox.show({
                        title: "Info",
                        msg: FigisMap.label("SIDP_NOGEOMETRY"),
                        buttons: Ext.Msg.OK,
                        icon: Ext.MessageBox.INFO,
                        scope: this
                    });  
                }else{
                    var geoJsonGeom = jsonData.features[0].geometry;
                    var projcode = "EPSG:4326";
                    var GeoJsonFormat = new OpenLayers.Format.GeoJSON();
    
                    var geom = GeoJsonFormat.read(geoJsonGeom, "Geometry");
                    
                    layer = new OpenLayers.Layer.Vector("highlight",{
                            displayInLayerSwitcher: false
                    });
                    var repro_geom = geom.clone().transform(
                        new OpenLayers.Projection(projcode),
                        myMap.getProjectionObject()
                    );
                    layer.addFeatures(new OpenLayers.Feature.Vector(repro_geom));
                    myMap.addLayer(layer);
                    var bounds = geom.clone().getBounds();
                    var repro_bbox = repro_geom.getBounds();
                    
                    // uncomment when work on the line 6 
                    //myMap.getLayersByName("Area types")[0].setVisibility(false);
                    
                    if(Ext.isIE){
                      myMap.zoomOut(); 
                    }
                    
                    var settings = {
                      zoomExtent: bounds.toBBOX(20)
                    };
                    
					zoomTo(settings,repro_bbox,zoom,false);
                    
                    //myMap.paddingForPopups.right = 240; //TODO: use this to center the popup when the search panel is opened!!! 
														  //but if do this we are problem on dateline (popup disappears)
                    
                    //var year = selectedRecord.get("year");
                    var year = Ext.getCmp("id_selectYear").getValue() || rec_year;
                    /*
                    var slider = Ext.getCmp('years-slider');
                    slider.setValue(year,true);
                    Ext.getCmp('years-min-field').setValue(year);
                    */
                    FigisMap.ol.setSelectedYear(year);
                    //TODO try use slider.updateVme();

                    // start refresh legend
                    var nameRFB = jsonData.features[0].properties.OWNER;
                    FigisMap.ol.refreshFilters(nameRFB);
                    // end
                    
                    // uncomment when work on the line 6
                    //myMap.getLayersByName("Area types")[0].setVisibility(true);
                    
                    FigisMap.ol.clearPopupCache();
                    
                    if(!zoom){            
                        if(getProjection() == "4326"){
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
                    msg: FigisMap.label("SIDP_NOGEOMETRY"),
                    buttons: Ext.Msg.OK,
                    icon: Ext.MessageBox.INFO,
                    scope: this
                });  
            },
            scope: this
        });
		
      };

/**
 * Vme.form.panels.SearchForm
 * form to perform searches on Vme search services (now to WFS) 
 * 
 */
Vme.form.panels.SearchForm = new Ext.FormPanel({
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
			fieldLabel: FigisMap.label("SEARCH_TEXT_LBL"),
			xtype: 'textfield',
			name : 'text',
			ref:'../text',
			emptyText: FigisMap.label("SEARCH_TEXT_EMP")
		},*/{
			fieldLabel: FigisMap.label('SEARCH_RFMO_LBL'),//+' [<a href="#">?</a>]',
			name: 'authority',
			ref:'../RFMO',
			id: "RFMOCombo",
			emptyText:  FigisMap.label('SEARCH_RFMO_EMP'),
			store: Vme.data.stores.rfmoStore,
			allowBlank:true,
			forceSelection:true,
			triggerAction: 'all',
			mode: 'local',
            valueField : 'id',
			displayField: 'acronym'
		},{
			fieldLabel: FigisMap.label('SEARCH_TYPE_LBL'),//+' [<a href="#">?</a>]',
			name: 'vme_type',
			ref: '../AreaType',
			emptyText:  FigisMap.label('SEARCH_TYPE_EMP'),
            value:   FigisMap.label('SEARCH_TYPE_EMP'),            
			allowBlank:true,
			forceSelection:true,
			triggerAction: 'all',
			mode: 'local',
			store:  Vme.data.stores.areaTypeStore,
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
		/*{
			fieldLabel: FigisMap.label('SEARCH_CRIT_LBL'),//+' [<a href="#">?</a>]',
			name: 'vme_criteria',
			ref: '../vmeCriteria',
			emptyText:  FigisMap.label('SEARCH_CRIT_EMP'),
			value:   FigisMap.label('SEARCH_CRIT_EMP'),   
			allowBlank:true,
			forceSelection:true,
			typeAhead: true,
			triggerAction: 'all',
			mode: 'local',
			store:  Vme.data.stores.VmeCriteriaStore,
			valueField : 'id',
			displayField: 'displayText'			
		},*/ 
		{
			fieldLabel: FigisMap.label('SEARCH_YEAR_LBL'),//+'[<a href="#">?</a>]',
			id: "id_selectYear",
			name: 'year',
			ref:'../year', 
			emptyText:FigisMap.label('SEARCH_YEAR_EMP'),
			allowBlank:true,
			forceSelection:true,
			typeAhead: true,
			triggerAction: 'all',
			mode: 'local',
			store:  Vme.data.stores.yearStore,
			displayField: 'id',
            valueField: 'id'
		}
	],

	buttons: [{
			text: FigisMap.label('SIDP_CLEAR'),
			ref: '../Clear',
			cls:'figisButton',
			handler: function(){
				Vme.form.panels.SearchForm.getForm().reset();
				document.getElementById('searchtext').value = "";
			}
			
		},{
			text: FigisMap.label('SIDP_SEARCH'),
			ref: '../Search',
			cls: 'figisButton',
			
			handler: function(){
                Vme.search(true);
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
 * Vme.search
 * Search VMEs zooming to the VME autority area.
 * 
 */
Vme.search = function(advanced){

	// ///////////////////////////////////////////////////
	// Retrieve Autority area extent to perform a zoomTo.
	// ///////////////////////////////////////////////////
	
	var RFMOCombo = Ext.getCmp("RFMOCombo");
	var RFMStore = RFMOCombo.getStore();
	var value = RFMOCombo.getValue();
    
    FigisMap.ol.clearPopupCache();  

    // remove highlight layer on new search
    var layer = myMap.getLayersByName("highlight")[0];
    //create layer
    if(layer){
        myMap.removeLayer(layer,false);
    }	        
        
	var dIndex = RFMStore.find("id", value); 
    
	if(dIndex > -1){
        var rfbCheckboxValue = Ext.getCmp(value+"_RFB").acronym;
        setRFBCheckBoxValue(rfbCheckboxValue);
        
		var r = RFMStore.getAt(dIndex);	
		var rfmName = r.data.acronym;
        
        // perform CQL_FILTER
        FigisMap.ol.refreshFilters(rfmName);
        
		var filter = new OpenLayers.Filter.Comparison({
			type: OpenLayers.Filter.Comparison.EQUAL_TO,
			property: FigisMap.rnd.vars.vmeSearchZoomTo.filterProperty,    // "RFB",
			value: rfmName
		});
		
		var protocol = new OpenLayers.Protocol.WFS({
		   version: FigisMap.rnd.vars.vmeSearchZoomTo.wfsVersion,          // "1.1.0",					
		   url: FigisMap.rnd.vars.vmeSearchZoomTo.wfsUrl,                  // "http://figisapps.fao.org/figis/geoserver/" + "wfs",									   
		   featureType: FigisMap.rnd.vars.vmeSearchZoomTo.featureType,     // "RFB_COMP",
		   featurePrefix: FigisMap.rnd.vars.vmeSearchZoomTo.featurePrefix, // "fifao",
		   srsName: FigisMap.rnd.vars.vmeSearchZoomTo.srsName,             // "EPSG:4326",
		   defaultFilter: filter
		});

		var mask = new Ext.LoadMask(Ext.getBody(), {msg: "Please wait ..."});
		
		var callback = function(r) {
			var features = r.features;
			
			if(!features || features.length < 1){
				mask.hide();
				
				Ext.MessageBox.show({
					title: "Info",
					msg: FigisMap.label("SIDP_NOFEATURES"),
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
                if (features[i].attributes.AREATYPE == 1){
                    areaType1.push({bounds:features[i].bounds})
                }else if(features[i].attributes.AREATYPE == 2){
                    areaType2.push({bounds:features[i].bounds})
                }
            }

			var size = areaType2.length == 0 ? areaType1.length : areaType2.length;
			var bounds = areaType2.length == 0 ? areaType1[0].bounds : areaType2[0].bounds;
			
			var bottom = bounds.bottom;
			var left = bounds.left;
			var right = bounds.right;
		    var top = bounds.top;
			
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
            
            var fixedZoomTo = vmeViewerRFBZoomTo[features[0].data.RFB]
            
            // ZOOM TO WRAPDATELINE FEATURES
            bounds = fixedZoomTo ? fixedZoomTo.zoomExtent : new OpenLayers.Bounds(left, bottom, right, top);
			
			//var test = new OpenLayers.Layer.Vector("test", {
			//		displayInLayerSwitcher: true
			//});

            var defaultProj = getProjection();
            var mapProj = myMap.getProjectionObject();
            
            var repro_geom = bounds.toGeometry().transform(
                new OpenLayers.Projection(FigisMap.rnd.vars.vmeSearchZoomTo.srsName),
                mapProj
                //defaultProj == "3031" ? new OpenLayers.Projection("EPSG:4326") : mapProj //use this if default map projection is 4326
            );
			
			//test.addFeatures(new OpenLayers.Feature.Vector(repro_geom));	
			//myMap.addLayers([test]);
			
			var repro_bbox = repro_geom.getBounds();
			var settings = {
				zoomExtent: bounds.toBBOX(20)
			};
			
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
                repro_bbox.newLeft = repro_bbox.right;
                repro_bbox.newRight = repro_bbox.left;
                repro_bbox.right = repro_bbox.newRight;
                repro_bbox.left = repro_bbox.newLeft;

                delete repro_bbox["newLeft"];
                delete repro_bbox["newRight"];
            }
        
			if(RFMOValue == RFMOId){
				settings.srs = "EPSG:3031";
				zoomTo(settings, repro_bbox, false, true);
			}else{
				zoomTo(settings, repro_bbox, true, true);
			}			
			
			//
			// Perform the store load
			//
            vmeSearch(advanced);
			
			mask.hide();
		};
		
		mask.show();
		var response = protocol.read({
			callback: callback
		});	
	}else{
		//
		// Perform the store load
		//
        vmeSearch(advanced);
	}
};

function vmeSearch(advanced){
	// ///////////////////
	// Perform search
	// ///////////////////
	var store = Vme.data.stores.SearchResultStore;
	store.resetTotal();
	store.removeAll();
	store.baseParams={};
	var fields = {};
	if(advanced){
		var fields = Vme.form.panels.SearchForm.getForm().getFieldValues(true);
	}
	fields.text = document.getElementById('searchtext').value;
	var params = {
		start: 0,          
		rows: Vme.data.constants.pageSize
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
	
	Vme.form.panels.SearchPanel.layout.setActiveItem('resultPanel');
}

/**
 * Vme.rfbZoomTo
 * Zooming to the RFB areas.
 * 
 */
Vme.rfbZoomTo = function(acronym,value){

	////////////////////////////////////////////////////
	// Retrieve RFB areas extent to perform a zoomTo. //
	////////////////////////////////////////////////////

    var rfbName = acronym;
    
    // perform CQL_FILTER
    FigisMap.ol.refreshFilters(rfbName);

    FigisMap.ol.clearPopupCache();    

    // remove highlight layer on new search
    var layer = myMap.getLayersByName("highlight")[0];
    //create layer
    if(layer){
        myMap.removeLayer(layer,false);
    }	   
    
    var filter = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: FigisMap.rnd.vars.vmeSearchZoomTo.filterProperty,    // "RFB",
        value: rfbName
    });
    
    var protocol = new OpenLayers.Protocol.WFS({
       version: FigisMap.rnd.vars.vmeSearchZoomTo.wfsVersion,          // "1.1.0",					
       url: FigisMap.rnd.vars.vmeSearchZoomTo.wfsUrl,                  // "http://figisapps.fao.org/figis/geoserverdv/" + "wfs",									   
       featureType: FigisMap.rnd.vars.vmeSearchZoomTo.featureType,     // "regulatory_areas",
       featurePrefix: FigisMap.rnd.vars.vmeSearchZoomTo.featurePrefix, // "vme",
       srsName: FigisMap.rnd.vars.vmeSearchZoomTo.srsName,             // "EPSG:4326",
       defaultFilter: filter
    });

    var mask = new Ext.LoadMask(Ext.getBody(), {msg: "Please wait ..."});
    
    var callback = function(r) {
        var features = r.features;
        
        if(!features || features.length < 1){
            mask.hide();
            
            Ext.MessageBox.show({
                title: "Info",
                msg: FigisMap.label("SIDP_NOFEATURES"),
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
            if (features[i].attributes.AREATYPE == 1){
                areaType1.push({bounds:features[i].bounds})
            }else if(features[i].attributes.AREATYPE == 2){
                areaType2.push({bounds:features[i].bounds})
            }
        }

        var size = areaType2.length == 0 ? areaType1.length : areaType2.length;
        var bounds = areaType2.length == 0 ? areaType1[0].bounds : areaType2[0].bounds;
        
        var bottom = bounds.bottom;
        var left = bounds.left;
        var right = bounds.right;
        var top = bounds.top;
        
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

            
        var fixedZoomTo = vmeViewerRFBZoomTo[features[0].data.RFB]
        
        // ZOOM TO WRAPDATELINE FEATURES
        bounds = fixedZoomTo ? fixedZoomTo.zoomExtent : new OpenLayers.Bounds(left, bottom, right, top);
        
        //var test = new OpenLayers.Layer.Vector("test", {
        //		displayInLayerSwitcher: true
        //});
        var defaultProj = getProjection();
        var mapProj = myMap.getProjectionObject();
        
        var repro_geom = bounds.toGeometry().transform(
            new OpenLayers.Projection(FigisMap.rnd.vars.vmeSearchZoomTo.srsName),
            mapProj
            //defaultProj == "3031" ? new OpenLayers.Projection("EPSG:4326") : mapProj //use this if default map projection is 4326
        );
        
        //test.addFeatures(new OpenLayers.Feature.Vector(repro_geom));	
        //myMap.addLayers([test]);
        
        var repro_bbox = repro_geom.getBounds();
        var settings = {
            zoomExtent: bounds.toBBOX(20)
        };
        
        // ////////////////////////////////////////////////////
        // Chek if 'CCAMLR' is selected in order to perform 
        // a reproject the map in 3031.
        // /////////////////////////////////////////////////////
        
        var RFBValue = features[0].data.RFB;            
        var RFBComboStore = Vme.data.stores.rfmoStore;
        var RFBRecord = RFBComboStore.getAt(RFBComboStore.find('acronym', "CCAMLR"));
        var RFBId = RFBRecord.get('acronym');
        
        // ZOOM TO WRAPDATELINE FEATURES
        if (fixedZoomTo && fixedZoomTo.isWrapDateLine){
            repro_bbox.newLeft = repro_bbox.right;
            repro_bbox.newRight = repro_bbox.left;
            repro_bbox.right = repro_bbox.newRight;
            repro_bbox.left = repro_bbox.newLeft;

            delete repro_bbox["newLeft"];
            delete repro_bbox["newRight"];
        }
        
        if(RFBValue == RFBId){
            settings.srs = "EPSG:3031";
            zoomTo(settings, repro_bbox, false, true);
        }else{
            zoomTo(settings, repro_bbox, true, true);
        }			
        
        mask.hide();
    };
    
    mask.show();
    var response = protocol.read({
        callback: callback
    });	

};

/** 
 * Vme.form.panels.SearchPanel
 * panel containing search form and search results dataview using
 * card layout. Wraps the previous components to complete search GUI
 *
 */
Vme.form.panels.SearchPanel = new Ext.Panel({
	
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
			items:[Vme.form.panels.SearchForm]
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
					items:[Vme.form.widgets.SearchResults],
					bbar : new Ext.ux.LazyPagingToolbar({
							store: Vme.data.stores.SearchResultStore,
							pageSize: Vme.data.constants.pageSize
					})	
			}],
			bbar:[{
				xtype: 'button',
				text: FigisMap.label('SEARCH_BACK_FORM'),
				iconCls: 'back-search-icon',
				handler: function(){Vme.form.panels.SearchPanel.layout.setActiveItem('searchForm');}
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
			//title:FigisMap.label('SIDP_MAP'),
			//iconCls:'map-icon',			
			renderHidden:true,
			defaults:{
				border:false
			},
			items:[{	
				id:'layerswitcherpanel',
				//title:FigisMap.label('SIDP_LAYERS'),
				iconCls: 'layers-icon',
				autoScroll: true,
				html:'<div id="layerswitcher"></div>'
			
			}]
		},
		{
            id: 'searchPanel',
			//title:FigisMap.label('SIDP_SEARCH'),
			iconCls: 'search-icon',
			items:[Vme.form.panels.SearchPanel]
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
    
Vme.data.stores.rfmoStore.on('load',function(store, records, options){
    
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
            boxLabel: '<a id="infoRFBimage_'+records.data.id+'_RFB'+'" style="color:#000000"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="theme/img/icons/information.png">'+records.data.acronym+'</a>',
            name: 'rfb',
            acronym: records.data.acronym,
            inputValue: records.data.id,
            listeners: {
                check: function(radio, checked){
                    if(checked){
                        var acronym = radio.acronym;
                        var value = radio.inputValue;
                        Vme.rfbZoomTo(acronym,value);
                        sidePanel.layout.setActiveItem('legendPanel');
                        sidePanel.expand();  
						
						toogleWME(false);
						toogleWMEOther(false);
						toogleFootprints(false);	
                    }
                },
                afterrender: function(radio){               
                    
                    //var rfbStore = 'rfbStore' + radio.acronym;      
                    Ext.Ajax.request({
                        url: FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/"+radio.acronym+"/scope/Regulatory/vmes",
                        headers: {"Accept": "application/json", 'Content-Type': 'application/json;charset=utf-8'},
                        success: function(response) {
                                var json = Ext.decode(response.responseText);
                                Vme.factsheetUrl[radio.acronym] = json.resultList[0].factsheetUrl;
                                var id = 'infoRFBimage_' + radio.id;
                                Ext.get(id).dom.lastChild.parentNode.outerHTML = '<a id="'+id+'" style="color:#000000" href="javascript:void(0);" //onClick="FigisMap.infoSourceLayers(\''+json.resultList[0].factsheetUrl+'\',true);"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="theme/img/icons/information.png"></a><span>'+radio.acronym+'</span>';
                        }
                    });

                    //Kiran: Commented this code out as it seems to create looped stores which is not allowed in ExtJs 
                    /*
                    var rfbStoreAcronym =  new Ext.data.JsonStore({
                        url: FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/"+radio.acronym+"/scope/Regulatory/vmes", //Vme.data.models.factsheetCCAMLR,
                        autoLoad: false,
                        remoteSort: false,
                        root: 'vmeDto',                      
                        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
                    });
                    
                    rfbStoreAcronym.load();
                    rfbStoreAcronym.on('load',function(store, records, options){
                        store.each(function(records,count,tot) {
                            Vme.factsheetUrl[radio.acronym] = records.data.factsheetUrl;
                            var id = 'infoRFBimage_' + radio.id;
                            Ext.get(id).dom.lastChild.parentNode.outerHTML = '<a id="'+id+'" style="color:#000000" href="javascript:void(0);" onClick="FigisMap.infoSourceLayers(\''+records.data.factsheetUrl+'\',true);"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="theme/img/icons/information.png"></a><span>'+radio.acronym+'</span>';
                        })
                    });
                    */
                    
                    //WORKAROUND TO MANAGE GFCM AND WECAFC WEB-SERVICE ERROR
                    //if(Vme.data.stores[rfbStore].data.length != 0){
                    /*if(radio.acronym != "GFCM" && radio.acronym != "WECAFC"){                    
                        Vme.data.stores[rfbStore].on('load',function(store, records, options){
                            store.each(function(records,count,tot) {
                                var id = 'infoRFBimage_' + radio.id;
                                Ext.get(id).dom.lastChild.parentNode.outerHTML = '<a id="'+id+'" style="color:#000000" href="javascript:void(0);" onClick="FigisMap.infoSourceLayers(\''+records.data.factsheetUrl+'\');"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="theme/img/icons/information.png"></a><span>'+radio.acronym+'</span>';
                            })
                        })
                    }else{
                        var id = 'infoRFBimage_' + radio.id;
                        Ext.get(id).dom.lastChild.parentNode.outerHTML = '<a id="'+id+'" style="color:#000000" href="javascript:void(0);" onClick="Vme.msgAlert(\''+radio.acronym+'\')"><img style="margin-bottom: 1px; vertical-align: bottom" title = "Clik To View Regional Measures" src="theme/img/icons/information.png"></a><span>'+radio.acronym+'</span>';
                    }*/
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
            setRFBCheckBoxValue(rfb);
        }        
    }

});

//REMOVE WHEN GFCM AND WECAFC WEB-SERVICE WILL UP
Vme.msgAlert = function (acronym){
    Ext.Msg.alert("MESSAGE", "WEB-SERVICE: "+acronym+" IS DOWN");
};
