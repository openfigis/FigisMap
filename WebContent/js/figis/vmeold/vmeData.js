/*
	vme-data.js
	data model and stores for VME using Extjs
	Authors: Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/

/**
 * Ext.ux.LazyJSonStore: lazyStore to load without 
 * knowing the total size of result list. Useful for
 * paged queries when the total number of records is 
 * not available/required
 *
 */
Ext.ux.LazyJsonStore = Ext.extend(Ext.data.JsonStore,{
	resetTotal:function (){
		this.tot = null;
	
	},
	loadRecords : function(o, options, success){
		if (this.isDestroyed === true) {
			return;
		}
		if(!o || success === false){
			if(success !== false){
				this.fireEvent('load', this, [], options);
			}
			if(options.callback){
				options.callback.call(options.scope || this, [], options, false, o);
			}
			return;
		}
		this.crs = this.reader.jsonData.crs;
		this.bbox =  this.reader.jsonData.bbox;
		this.featurecollection = this.reader.jsonData;
		//custom total workaround
		var estimateTotal = function(o,options,store){
			var current = o.totalRecords + options.params[store.paramNames.start] ;
			var currentCeiling = options.params[store.paramNames.start] + options.params[store.paramNames.limit];
			if(current < currentCeiling){
				store.tot = current;
				return current;
			}else{
				
				return  store.tot || 100000000000000000; 
			}

		};
		o.totalRecords = estimateTotal(o,options,this);
		//end of custom total workaround
		
		var r = o.records, t = o.totalRecords || r.length;
		if(!options || options.add !== true){
			if(this.pruneModifiedRecords){
				this.modified = [];
			}
			for(var i = 0, len = r.length; i < len; i++){
				r[i].join(this);
			}
			if(this.snapshot){
				this.data = this.snapshot;
				delete this.snapshot;
			}
			this.clearData();
			this.data.addAll(r);
			this.totalLength = t;
			this.applySort();
			this.fireEvent('datachanged', this);
		}else{
			this.totalLength = Math.max(t, this.data.length+r.length);
			this.add(r);
		}
		this.fireEvent('load', this, r, options);
		if(options.callback){
			options.callback.call(options.scope || this, r, options, true);
		}
	}
	
});





	
	
/**
 * Ext.ux.LazyPagingToolbar
 * Paging toolbar for lazy stores like Ext.ux.LazyJsonStore
 */
Ext.ux.LazyPagingToolbar = Ext.extend(Ext.PagingToolbar,{
		
		displayInfo: true,
		displayMsg: "",
		emptyMsg: "",
		afterPageText:"",
		beforePageText:"",
		onLoad : function(store, r, o){
			if(!this.rendered){
				this.dsLoaded = [store, r, o]; 
				return;
			}
			var p = this.getParams();
			this.cursor = (o.params && o.params[p.start]) ? o.params[p.start] : 0;
			var d = this.getPageData(), ap = d.activePage, ps = d.pages;

			this.afterTextItem.setText(String.format(this.afterPageText, d.pages));
			this.inputItem.setValue(ap);
			this.first.setDisabled(ap == 1);
			this.prev.setDisabled(ap == 1);
			this.next.setDisabled(ap >= ps);
			this.last.setDisabled(ap >= ps);
			this.refresh.enable();
			this.updateInfo();
			this.fireEvent('change', this, d);
		},
		listeners:{
			beforerender: function(){
				this.refresh.setVisible(false);
				this.last.setVisible(false);
			},
			change: function (total,pageData){
				if(pageData.activePage>pageData.pages){
					this.movePrevious();
					this.next.setDisabled(true);
				}
				
			}
		}
});

var Vme={
	utils: {
		generateDownloadLink :function(ows,types,filters,format,otherparams){
			try{
				var cql_filter = filters.join(";");
			}catch(e){
				cql_filter =filters;
			}
			try{
				var typeName = types.join(",");
			}catch(e){
				typeName = types;
			}
			var addParams = "";
			for (var name in otherparams){
				addParams += "&" + name + "=" + encodeURIComponent( otherparams[name] );
			}
			return ows+"?service=WFS&version=1.0.0&request=GetFeature" 
				+"&typeName="+ encodeURIComponent(typeName)
				+ "&outputFormat=" + encodeURIComponent( format )
				+ (cql_filter ? "&cql_filter=" + encodeURIComponent( cql_filter ):"")
				+ addParams;
									
		
		},
		generateFidFilter:function(fids){
			if(fids ==undefined) return ;
			var len = fids.length;
			if(!len) return ;
			
			var filter = "IN ('" +fids[0]+"'";
			for (var i=1; i<len ;i++){
				filter += ",'" +fids[i]+ "'";
			} 
			filter += ")";
			return filter;
		
		},
		generateVMEFilter:function(vme_id){
			if (vme_id ==undefined) return ;
			return "VME_ID = '" +vme_id +"'";
		},
		surfaceUoMConverter: function(values, uom){
			if(uom == "ha"){
				var hectares = values.surface/10000;
				return Math.round(hectares);
			}else if(uom == "skm"){
				var skm = values.surface/1000000;
				return Math.round(skm);
			}
		}		
	}


};

/** 
 * Vme.data contains templates and base Extjs Stores, models to load Vme data
 */
Vme.data={
	templates: {
		/** Vme.data.templates.searchResult
		 * displays search results with utiities to display human readable fields
	     */
		searchResult: 
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result">' +
						'<em>Name: </em><span class="searchResultValue">{localname}</span><br/>'+				
						//'<em>Validity: </em><span class="searchResultValue">{[this.getValidity(values)]}</span> <br/> '+	
						'<em>Measure first applied in: </em><span class="searchResultValue">{[this.getValidity(values, true)]}</span> <br/> '+	
						//'<em>Year: </em><span class="searchResultValue">{year}</span> <br/> '+
						//'<em>Management Body/Authority(ies): </em><span class="searchResultValue">{owner}</span><br/>'+
						'<em>Management Body/Authority: </em><span class="searchResultValue">{owner}</span><br/>'+
                        '<a onclick="Vme.clickOnFeature(\'{geographicFeatureId}\',{year},false)">'+
                        '<img title="More information" src="theme/img/icons/buttoninfo.png" />'+
                        '</a> '+
                        '<a onclick="Vme.clickOnFeature(\'{geographicFeatureId}\',{year},true)">'+
                       '<img title="Zoom to area" src="theme/img/icons/buttonzoom.png" />'+
                        '</a> '+
                        '<a onClick="FigisMap.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');">'+
                        '<img title="View fact sheet" src="theme/img/icons/buttonfactsheet.png" />'+
                        '</a> '+
					'</div>'+
				'</tpl>',
				{
					compiled:true,
                    getFactsheetUrl: function(values){

                        if(values.factsheetUrl){
                            return(values.factsheetUrl);
                        }else
                        {
                            return("fishery/vme/10/en");
                        }
                    },
                    /**
                     * Returns Validity String
                     * "validityFrom - validityTo" or "from validityFrom"
                     * 
                     */
                    getValidity: function(values, firstOnly){
						if(firstOnly === true){
							return values.validityPeriodFrom ? values.validityPeriodFrom : "Not Found";
						}else{
							if(values.validityPeriodFrom){
								if(values.validityPeriodTo && values.validityPeriodTo != 9999){
									return values.validityPeriodFrom + " - " + values.validityPeriodTo;
								}else{
									return "from "+ values.validityPeriodFrom;
								}
							}else{
								return("Not Found");
							}
						}
                    }
				}
			),			
		vme_cl: 
			new Ext.XTemplate(
				'<tpl for=".">'+
                    '<tpl if="[xindex] &gt; \'1\'">'+
                        '<hr/>'+
                    '</tpl>'+
					'<div class="popup-result" style="text-align:left;">' +
						'<h3>{localname}</h3>'+
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						//'<em>Measure first applied in: </em><span>{[this.getValidity(values, true)]}</span> <br/> '+
                        '<em>Closed since </em><span>{validityPeriodFrom}</span> {[this.checkUntilYear(values)]}{[this.checkYearReview(values)]}'+
                        //'<em>Measure: </em><span>{measure}</span> <a  target="_blank" href="{pdfURL}"><img title="Download pdf" src="theme/img/icons/download_pdf.png"></a><br/> '+
                        '<em>Measure: </em>{[this.formatMeasure(values)]}'+
						//'<em>Validity: </em><span>{[this.getValidity(values)]}</span> <br/> '+
						//'<em>Year: </em>{year}<br/> '+
						//'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						//'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
						'<em>Area Type: </em><span>{vmeType}</span> <br/> '+
                        '<em>Surface: </em><span>{[Vme.utils.surfaceUoMConverter(values, "skm")]}</span><span> km&#178;</span> <br/> '+
						//'<em>Start Date: </em><span>{validityPeriodFrom}</span> <br/> '+
                        //'<em>End Date: </em><span>{validityPeriodTo}</span> <br/> '+                        
						// '<em>UN Criteria: </em>{criteria}<br/> '+
						//'<em>Vme ID:</em><span class="own"> {vme_id}</span><br/>'+
                        '<br/>' +
						'<div style="text-align:right;float:right;">' +
							'<a  target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							//'{[this.getDownloadFDS(values)]}' +
							'&nbsp;&nbsp;<a onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
                                //'FigisMap.ol.refreshFilters(\'{owner_acronym}\');'+
                               // 'setRFBCheckBoxValue(\'{owner_acronym}\');'+
                                //'FigisMap.ol.clearPopupCache();'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
                            '&nbsp;&nbsp;<a href="javascript:void(0);" onClick="FigisMap.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');"><img title="View fact sheet" src="theme/img/icons/buttonfactsheet.png" /></a>' +

							//'<br/>{[this.addProtectedLinks(values)]}' +
                        '</div>'+
						'<div style="text-align:left;">' +
							'<u><a href="javascript:void(0);" onClick="FigisMap.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');" >Access the VME Factsheet</a><br/><a href="javascript:void(0);" onClick="FigisMap.infoSourceLayers(\'{[this.getFactsheet(values)]}\',true);" >Access the Regional Factsheet</a></u>' +
                        '</div>'+                        
                    '</div>'+
				'</tpl>',
				{
					compiled:true,
                    getFactsheet: function(values){
                        return Vme.factsheetUrl[values.owner_acronym];
                    },
                    checkUntilYear:function(values){
                        var untilValue = values.validityPeriodTo.split("-")
                        if(untilValue[0] === "9999"){
                            return ""; 
                        }else{
                            return "<em>until</em> <span>"+values.validityPeriodTo+"</span>";
                        }
                    },
                    checkYearReview:function(values){
                        if(values.reviewYear === 0 || values.reviewYear === null){
                            return "<br/>"; 
                        }else{
                            return ", <em>review in</em> <span>"+values.reviewYear+"</span><br/>";
                        }
                    },
                    formatMeasure:function(values){
                        var pdf = values.pdfURL;
                        var measureArray = values.measure.split("__");
                        var html="";
                        
                        for (var i = 0;i<measureArray.length;i++){
                            if (pdf == ""){
                                html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"></a><br/>';
                            }else{
                                html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"><img title="Download pdf" src="theme/img/icons/download_pdf.png"></a><br/>';
                            }
                        }
                        return html;
                    },
					getBBOX:function(values){
                        if (values.bbox.left == -180)
                            values.bbox.left = 180
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.bbox;
							var repro_geom = geom.clone().transform(
                                new OpenLayers.Projection(projcode),
                                myMap.getProjectionObject()
                            );
						
                            //var repro_bbox = repro_geom.getBounds();
                            return repro_geom.toArray();
						
						}
					},
					getVert: function(geom){
                        var vert = {};
                        var projcode = "EPSG:4326";
                        var repro_geom = geom.clone().transform(
                            new OpenLayers.Projection(projcode),
                            myMap.getProjectionObject()
                        );                        
                        if(getProjection() == "4326"){
                            vert = "{x: " + geom.getVertices()[0].x +", y:" + geom.getVertices()[0].y + "}";
                            return vert;
                        }else{
                            var checkWrapDateLine = repro_geom.getVertices()[0].x * (-1);
                            var getVerticesX = geom.getVertices()[0].x == 180 ? checkWrapDateLine : repro_geom.getVertices()[0].x;
                            vert = "{x: " + getVerticesX +", y:" + repro_geom.getVertices()[0].y + "}";
                            //vert = "{x: " + repro_geom.getVertices()[0].x +", y:" + repro_geom.getVertices()[0].y + "}";
                            return vert;
                        }                      
					},
                    /**
                     * Returns Validity String
                     * "validityFrom - validityTo" or "from validityFrom"
                     * 
                     */
                    getValidity: function(values, firstOnly){
						if(firstOnly === true){
							return values.validityPeriodFrom ? values.validityPeriodFrom : "Not Found";
						}else{
							if(values.validityPeriodFrom){
								if(values.validityPeriodTo && values.validityPeriodTo != 9999){
									return values.validityPeriodFrom + " - " + values.validityPeriodTo;
								}else{
									return "from "+ values.validityPeriodFrom;
								}
							}else{
								return("Not Found");
							}
						}
                    },
                    /**
                     * Returns the link to the factsheet
                     */
                    getFactsheetUrl: function(values){

                        if(values.factsheetUrl){
                            return(values.factsheetUrl);
                        }else
                        {
                            //return("fishery/vme/10/en");
                            //return("http://figisapps.fao.org/fishery/vme/10/en");
                            return(FigisMap.geoServerBase + "/fishery/vme/10/en");
                        }
                    },
					/**
					 * Download all vme areas
					 */
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_cl,
							Vme.utils.generateVMEFilter(values.vme_id),
							"shape-zip",
							{format_options:"filename:VME-DB_"+values.vme_id+".zip"}
						);
						//return +"?service=WFS&version=1.0.0&request=GetFeature&typeName=" + FigisMap.fifao.vme+ "&outputFormat=shape-zip" +
						//	"&cql_filter=" + encodeURIComponent( "YEAR = '" + values.year + "' AND VME_ID = '" +values.vme_id +"'" )
							
					},
					/**
					 * Download all vme areas + encoutners & sd for this vme
					 */
					getDownloadFDS:function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						var filter = Vme.utils.generateVMEFilter(values.vme_id);
						filter =filter +";"+ filter + ";" + filter;
						return '<a class="zipmlink" target="_blank" href="'+
							Vme.utils.generateDownloadLink(
								FigisMap.rnd.vars.ows,
                                //Remove encounters and ...
								//[FigisMap.fifao.vme,FigisMap.fifao.vme_en,FigisMap.fifao.vme_sd],
                                [FigisMap.fifao.vme_cl],
								filter,
								"shape-zip",
								{format_options:"filename:VME-DB_"+values.vme_id+"_DS.zip"}
							)
							+'">Download full Data Set</a>' ;
					},
					addProtectedLinks: function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						return  '<a class="rellink" onClick=\'Ext.MessageBox.show({title: "Info",msg: "Related Encounters and Survey Data not implemented yet",buttons: Ext.Msg.OK,icon: Ext.MessageBox.INFO,scope: this}); \'>Related</a>';
					}
				}
			),
		vme_oa: 
			new Ext.XTemplate(
                //OLD POPUP 
				/*'<tpl for=".">'+
                    '<tpl if="[xindex] &gt; \'1\'">'+
                        '<hr/>'+
                    '</tpl>'+
					'<div class="popup-result" style="text-align:left;">' +
						'<h3>{localname}</h3>'+
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						//'<em>Measure first applied in: </em><span>{[this.getValidity(values, true)]}</span> <br/> '+
                        '<em>Closed since </em><span>{validityPeriodFrom}</span> <em>until</em> <span>{validityPeriodTo}, </span><em>review in <span>{review_date}</span></em><br/> '+
                        //'<em>Measure: </em><span>{measure}</span> <a  target="_blank" href="{pdfURL}"><img title="Download pdf" src="theme/img/icons/download_pdf.png"></a><br/> '+
                        '<em>Measure: </em>{[this.formatMeasure(values)]}'+
						//'<em>Validity: </em><span>{[this.getValidity(values)]}</span> <br/> '+
						//'<em>Year: </em>{year}<br/> '+
						//'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						//'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
						'<em>Area Type: </em><span>{vmeType}</span> <br/> '+
                        '<em>Surface: </em><span>{[this.toHectares(values)]}</span><em> (ha)</em> <br/> '+
						//'<em>Start Date: </em><span>{validityPeriodFrom}</span> <br/> '+
                        //'<em>End Date: </em><span>{validityPeriodTo}</span> <br/> '+                        
						// '<em>UN Criteria: </em>{criteria}<br/> '+
						//'<em>Vme ID:</em><span class="own"> {vme_id}</span><br/>'+
						
						'<div style="text-align:right;">' +
							'<a  target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							//'{[this.getDownloadFDS(values)]}' +
							'&nbsp;&nbsp;<a onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
                                //'FigisMap.ol.refreshFilters(\'{owner_acronym}\');'+
                                //'FigisMap.ol.clearPopupCache();'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
                            '&nbsp;&nbsp;<a href="javascript:void(0);" onClick="FigisMap.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');"><img title="View fact sheet" src="theme/img/icons/buttonfactsheet.png" /></a>' +

							//'<br/>{[this.addProtectedLinks(values)]}' +
                        '</div>'+
                    '</div>'+
				'</tpl>',*/
				'<tpl for=".">'+
					'<div class="popup-result" style="text-align:left;">' +
						'<h3>{feature_localname}</h3>'+
						'<em>Year: </em>{feature_year}<br/> '+
						'<em>Management Body/Authority: </em><span class="own">{owner_acronym}</span><br/>'+
						'<em>Geographical reference: </em><span class="geo_ref" >{feature_geo_ref}</span> <br/>'+
                        '<em>Surface: </em><span>{[Vme.utils.surfaceUoMConverter(values, "skm")]}</span><span> km&#178;</span> <br/> '+                         
						//'<br/><br/>'+
						'<br/>' +
						'<div>'+
						'<div style="text-align:right;float:right;">' +
							'<a class="" target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							'<a class="" onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
                                //'FigisMap.ol.refreshFilters(\'{owner}\');'+   
                                //'setRFBCheckBoxValue(\'{owner}\');'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
						'</div>'+
						'<div style="text-align:left;">' +
							'<u><a href="javascript:void(0);" onClick="FigisMap.infoSourceLayers(\'{[this.getFactsheet(values)]}\',true);" >Access the Regional Factsheet</a></u>' +
                        '</div>'+                         
						'</div>'+
					'</div>'+
				'</tpl>',                
				{
					compiled:true,
                    getFactsheet: function(values){
                        return Vme.factsheetUrl[values.owner_acronym];
                    },                         
                    formatMeasure:function(values){
                        var pdf = values.pdfURL;
                        var measureArray = values.measure.split("__");
                        var html="";
                        for (var i = 0;i<measureArray.length;i++){
                            if (pdf == ""){
                                html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"></a><br/>';
                            }else{
                                html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"><img title="Download pdf" src="theme/img/icons/download_pdf.png"></a><br/>';
                            }
                        }
                        return html;
                    },                            
					getBBOX:function(values){
                        if (values.bbox.left == -180)
                            values.bbox.left = 180
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.bbox;
							var repro_geom = geom.clone().transform(
                                new OpenLayers.Projection(projcode),
                                myMap.getProjectionObject()
                            );
						
                            //var repro_bbox = repro_geom.getBounds();
                            return repro_geom.toArray();
						
						}
					},
					getVert: function(geom){
                        var vert = {};
                        var projcode = "EPSG:4326";
                        var repro_geom = geom.clone().transform(
                            new OpenLayers.Projection(projcode),
                            myMap.getProjectionObject()
                        );                        
                        if(getProjection() == "4326"){
                            vert = "{x: " + geom.getVertices()[0].x +", y:" + geom.getVertices()[0].y + "}";
                            return vert;
                        }else{
                            var checkWrapDateLine = repro_geom.getVertices()[0].x * (-1);
                            var getVerticesX = geom.getVertices()[0].x == 180 ? checkWrapDateLine : repro_geom.getVertices()[0].x;
                            vert = "{x: " + getVerticesX +", y:" + repro_geom.getVertices()[0].y + "}";
                            //vert = "{x: " + repro_geom.getVertices()[0].x +", y:" + repro_geom.getVertices()[0].y + "}";
                            return vert;
                        }                      
					},
                    /**
                     * Returns Validity String
                     * "validityFrom - validityTo" or "from validityFrom"
                     * 
                     */
                    getValidity: function(values, firstOnly){
						if(firstOnly === true){
							return values.validityPeriodFrom ? values.validityPeriodFrom : "Not Found";
						}else{
							if(values.validityPeriodFrom){
								if(values.validityPeriodTo && values.validityPeriodTo != 9999){
									return values.validityPeriodFrom + " - " + values.validityPeriodTo;
								}else{
									return "from "+ values.validityPeriodFrom;
								}
							}else{
								return("Not Found");
							}
						}
                    },
                    /**
                     * Returns the link to the factsheet
                     */
                    getFactsheetUrl: function(values){

                        if(values.factsheetUrl){
                            return(values.factsheetUrl);
                        }else
                        {
                            return("fishery/vme/10/en");
                        }
                    },
					/**
					 * Download all vme areas
					 */
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_oa,
							Vme.utils.generateVMEFilter(values.vme_id),
							"shape-zip",
							{format_options:"filename:VME-DB_"+values.vme_id+".zip"}
						);
						//return +"?service=WFS&version=1.0.0&request=GetFeature&typeName=" + FigisMap.fifao.vme+ "&outputFormat=shape-zip" +
						//	"&cql_filter=" + encodeURIComponent( "YEAR = '" + values.year + "' AND VME_ID = '" +values.vme_id +"'" )
							
					},
					/**
					 * Download all vme areas + encoutners & sd for this vme
					 */
					getDownloadFDS:function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						var filter = Vme.utils.generateVMEFilter(values.vme_id);
						filter =filter +";"+ filter + ";" + filter;
						return '<a class="zipmlink" target="_blank" href="'+
							Vme.utils.generateDownloadLink(
								FigisMap.rnd.vars.ows,
                                //Remove encounters and ...
								//[FigisMap.fifao.vme,FigisMap.fifao.vme_en,FigisMap.fifao.vme_sd],
                                [FigisMap.fifao.vme_oa],
								filter,
								"shape-zip",
								{format_options:"filename:VME-DB_"+values.vme_id+"_DS.zip"}
							)
							+'">Download full Data Set</a>' ;
					},
					addProtectedLinks: function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						return  '<a class="rellink" onClick=\'Ext.MessageBox.show({title: "Info",msg: "Related Encounters and Survey Data not implemented yet",buttons: Ext.Msg.OK,icon: Ext.MessageBox.INFO,scope: this}); \'>Related</a>';
					}
				}
			),            
		encounters :
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result" style="text-align:left;">' +						
						'<em>Taxa: </em><span>{taxa}</span> <br/> '+
						'<em>Reporting Year: </em>{year}<br/> '+
						'<em>Quantity: </em><span>{quantity} {unit}</span> <br/> '+
						'<em>Vme ID:</em><span class="own"> {vme_id}</span><br/>'+
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
						'<br/>'+
						
						'<div style="text-align:right;">' +
							'<a class="" target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							'<a class="" onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
						
						'</div>'+
					'</div>'+
				'</tpl>',
				{
					compiled:true,
					getBBOX:function(values){
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.geometry;
							var repro_geom = geom.clone().transform(
							new OpenLayers.Projection(projcode),
							myMap.getProjectionObject()
						);
						
						var repro_bbox = repro_geom.getBounds();
						return repro_bbox.toArray();
						
						}
					},
					getVert: function(geom){
						vert  = geom.getVertices()[0];
						
						return "{x:"+vert.x+",y:"+vert.y+"}";
						//return evt;
					},
					/**
					 * Downloads the single point
					 */
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_en,
							Vme.utils.generateFidFilter(values.id),
							"shape-zip",
							{format_options:"filename:VME-DB_ENC_"+values.vme_id+"_SP.zip"}
						);
						//return +"?service=WFS&version=1.0.0&request=GetFeature&typeName=" + FigisMap.fifao.vme+ "&outputFormat=shape-zip" +
						//	"&cql_filter=" + encodeURIComponent( "YEAR = '" + values.year + "' AND VME_ID = '" +values.vme_id +"'" )
							
					},
					/**
					 * Download all points for this vme
					 */
					getDownloadFDS:function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						
						return '<a class="zipmlink" target="_blank" href="'+
							Vme.utils.generateDownloadLink(
								FigisMap.rnd.vars.ows,
								FigisMap.fifao.vme_en,
								Vme.utils.generateVMEFilter(values.vme_id),
								"shape-zip",
								{format_options:"filename:VME-DB_ENC_"+values.vme_id+".zip"}
							)
							+'">Download full Data Set</a>' ;
					}
				}
			),
		surveydata :
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result"  style="text-align:left;">' +						
						'<em>Taxa: </em><span>{taxa}</span> <br/> '+
						'<em>Reporting Year: </em>{year}<br/> '+
						'<em>Quantity: </em><span>{quantity} {unit}</span> <br/> '+
						'<em>Vme ID:</em><span class="own"> {vme_id}</span><br/>'+
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
						'<br/>'+
						
						'<div style="text-align:right;">' +
							'<a class="" target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							'<a class="" onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
						'</div>'+
					'</div>'+
				'</tpl>',
				{
					compiled:true,
					getBBOX:function(values){
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.geometry;
							var repro_geom = geom.clone().transform(
							new OpenLayers.Projection(projcode),
							myMap.getProjectionObject()
						);
						
						var repro_bbox = repro_geom.getBounds();
						return repro_bbox.toArray();
						
						}
					},
					getVert: function(geom){
						vert  = geom.getVertices()[0];
						
						return "{x:"+vert.x+",y:"+vert.y+"}";
						//return evt;
					},
					/**
					 * Downloads the single point
					 */
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_sd,
							Vme.utils.generateFidFilter(values.id),
							"shape-zip",
							{format_options:"filename:VME-DB_SD_"+values.vme_id+"_SP.zip"}
						);
						//return +"?service=WFS&version=1.0.0&request=GetFeature&typeName=" + FigisMap.fifao.vme+ "&outputFormat=shape-zip" +
						//	"&cql_filter=" + encodeURIComponent( "YEAR = '" + values.year + "' AND VME_ID = '" +values.vme_id +"'" )
							
					},
					/**
					 * Download all points for this vme
					 */
					getDownloadFDS:function(values){
						/*if(!FigisMap.rnd.status.logged){
							return "";
						}*/
						
						return '<a class="zipmlink" target="_blank" href="'+
							Vme.utils.generateDownloadLink(
								FigisMap.rnd.vars.ows,
								FigisMap.fifao.vme_sd,
								Vme.utils.generateVMEFilter(values.vme_id),
								"shape-zip",
								{format_options:"filename:VME-DB_SD_"+values.vme_id+".zip"}
							)
							+'">Download full Data Set</a>' ;
					}
				}
			),
		aggregate :
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result" style="text-align:left">' +
						'<em>Count: </em>{count}<br/>'+
						'<em>Year: </em> <span class="status" >{year}</span><br/>' +
						//'<em>Competent Authority: </em> <span class="status" >{owner}</span><br/>' +
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
					'</div>'+
				'</tpl>',
				{
					compiled:true
					
				}
			),
		footprints :
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="popup-result" style="text-align:left;">' +
						'<h3>{localname}</h3>'+
						'<em>Year: </em>{year}<br/> '+
						'<em>Management Body/Authority: </em><span class="own">{owner}</span><br/>'+
						'<em>Geographical reference: </em><span class="geo_ref" >{geo_ref}</span> <br/>'+
                        '<em>Surface: </em><span>{[Vme.utils.surfaceUoMConverter(values , "skm")]}</span><span> km&#178;</span> <br/> '+                         
						//'<br/><br/>'+
                        '<br/>' +
						'<div>'+
						'<div style="text-align:right;float:right;">' +
							'<a class="" target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							'<a class="" onClick="'+
								'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
                                //'FigisMap.ol.refreshFilters(\'{owner}\');'+   
                                //'setRFBCheckBoxValue(\'{owner}\');'+
								'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
						'</div>'+
						'<div style="text-align:left;">' +
							'<u><a href="javascript:void(0);" onClick="FigisMap.infoSourceLayers(\'{[this.getFactsheet(values)]}\',true);" >Access the Regional Factsheet</a></u>' +
                        '</div>'+                         
						'</div>'+
					'</div>'+
				'</tpl>',
				{
					compiled:true,           
                    getFactsheet: function(values){
                        return Vme.factsheetUrl[values.owner];
                    },                                    
					getBBOX:function(values){
                        if (values.bbox.left == -180)
                            values.bbox.left = 180
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.bbox;
							var repro_geom = geom.clone().transform(
                                new OpenLayers.Projection(projcode),
                                myMap.getProjectionObject()
                            );
						
                            //var repro_bbox = repro_geom.getBounds();
                            return repro_geom.toArray();
						
						}
					},
					getVert: function(geom){
                        var vert = {};
                        var projcode = "EPSG:4326";
                        var repro_geom = geom.clone().transform(
                            new OpenLayers.Projection(projcode),
                            myMap.getProjectionObject()
                        );                        
                        if(getProjection() == "4326"){
                            vert = "{x: " + geom.getVertices()[0].x +", y:" + geom.getVertices()[0].y + "}";
                            return vert;
                        }else{
                            var checkWrapDateLine = repro_geom.getVertices()[0].x * (-1);
                            var getVerticesX = geom.getVertices()[0].x == 180 ? checkWrapDateLine : repro_geom.getVertices()[0].x;
                            vert = "{x: " + getVerticesX +", y:" + repro_geom.getVertices()[0].y + "}";
                            //vert = "{x: " + repro_geom.getVertices()[0].x +", y:" + repro_geom.getVertices()[0].y + "}";
                            return vert;
                        }                      
					},
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_bfa,
							Vme.utils.generateVMEFilter([values.vme_id]),
							"shape-zip"
						);
					}					
				}
			),
		regarea :
			new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="popup-result" style="text-align:left;">' +
						'<h3>Name: {rfb}</h3>'+
						//'<em>NAME: </em>{rfb}<br/> '+
						//'<em>AREATYPE: </em><span class="own">{area_type}</span><br/>'+
						'<em>Perimeter: </em><span class="geo_ref" >{SHAPE_LENG}</span> <br/>'+
                        '<em>Area: </em><span class="geo_ref" >{SHAPE_AREA}</span> <br/>'+
						//'<br/><br/>'+
						
						'<div>'+
						'<div style="text-align:right;">' +
							//'<a class="" target="_blank" href="{[this.getDownloadLink(values)]}"><img title="Download as shapefile" src="theme/img/icons/download.png"></a>' +
							//'<a class="" onClick="'+
							//	'myMap.zoomToExtent(OpenLayers.Bounds.fromString( \'{[this.getBBOX(values)]}\'));'+
                            //    'FigisMap.ol.refreshFilters(\'{owner_acronym}\');'+   
							//	'FigisMap.ol.emulatePopupFromVert({[this.getVert(values.geometry)]})'+
							//'"><img title="Zoom to area" src="theme/img/icons/buttonzoom.png"></a>' +
                            //'&nbsp;&nbsp;<a href="javascript:void(0);" onClick="FigisMap.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');"><img title="View fact sheet" src="theme/img/icons/buttonfactsheet.png" /></a>' +                            
                            '&nbsp;&nbsp;<a href="javascript:void(0);" onClick="alert(\'{rfb}\');"><img title="View fact sheet" src="theme/img/icons/buttonfactsheet.png" /></a>' +                            
						'</div>'+                          
						'</div>'+
					'</div>'+
				'</tpl>',
				{
					compiled:true,               
					getBBOX:function(values){
						var projcode = "EPSG:4326";
						if(myMap.getProjection() == projcode ){
							bbox = values.bbox;
							return bbox.toArray(); 
						}else{
							var geom = values.geometry;
							var repro_geom = geom.clone().transform(
							new OpenLayers.Projection(projcode),
							myMap.getProjectionObject()
						);
						
						var repro_bbox = repro_geom.getBounds();
						return repro_bbox.toArray();
						
						}
					},
					getVert: function(geom){
						vert  = geom.getVertices()[0];
						
						return "{x:"+vert.x+",y:"+vert.y+"}";
						//return evt;
					},
					getDownloadLink: function(values){
						return Vme.utils.generateDownloadLink(
							FigisMap.rnd.vars.ows,
							FigisMap.fifao.vme_bfa,
							Vme.utils.generateVMEFilter([values.vme_id]),
							"shape-zip"
						);
					},
                    /**
                     * Returns the link to the factsheet
                     */
                    getFactsheetUrl: function(values){

                        if(values.factsheetUrl){
                            return(values.factsheetUrl);
                        }else
                        {
                            return("fishery/vme/10/en");
                        }
                    }					
				}
			)
	},
	constants:{
		pageSize:8
	}
};

/**
 * Models: base tipes for Vme for Extjs Stores 
 *
 */
Vme.data.models = {
	//rfmos : [['CCAMLR','CCAMLR'],['NAFO','NAFO'],['NEAFC','NEAFC']],
	//rfmosUrl : "http://figisapps.fao.org/figis/ws/vme/webservice/references/authority/en/list",
	rfmosUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/authority/en/list",
	/*
	areaTypes : [
		[1, FigisMap.label('VME_TYPE_VME')],
		[2, FigisMap.label('VME_TYPE_RISK')],
		[3, FigisMap.label('VME_TYPE_BPA')],
		[4, FigisMap.label('VME_TYPE_CLOSED')],
		[5, FigisMap.label('VME_TYPE_OTHER')]
	],
	*/
    //areaTypesUrl : "http://figisapps.fao.org/figis/ws/vme/webservice/references/type/en/list",
    areaTypesUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/type/en/list",
	/*
	VmeStatuses:[ 
		[1, FigisMap.label("VME_STATUS_ENS")],
		[2, FigisMap.label("VME_STATUS_UNDEST")],
		[3, FigisMap.label("VME_STATUS_RSK")],
		[4, FigisMap.label("VME_STATUS_VOL")],
		[5, FigisMap.label("VME_STATUS_EXP")],
		[6, FigisMap.label("VME_STATUS_POT")],
		[7, FigisMap.label("VME_STATUS_TEMP")]
		
	],
	*/
    //VmeStatusesUrl : "http://figisapps.fao.org/figis/ws/vme/webservice/references/authority/en/list",
    VmeStatusesUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/authority/en/list",
    //) : "http://figisapps.fao.org/figis/ws/vme/webservice/references/authority/en/list",
	/*
	VmeCriteria:[ 
		[0, FigisMap.label("VME_CRITERIA_UNIQUE")],
		[1, FigisMap.label("VME_CRITERIA_FUNCT")],
		[2, FigisMap.label("VME_CRITERIA_FRAG")],
		[3, FigisMap.label("VME_CRITERIA_LIFE")],
		[4, FigisMap.label("VME_CRITERIA_STRUCT")],
		[5, FigisMap.label("VME_CRITERIA_NOTS")]
	],
	*/
    //VmeCriteriaUrl :"http://figisapps.fao.org/figis/ws/vme/webservice/references/criteria/en/list",
    VmeCriteriaUrl :FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/criteria/en/list",
	
	//years : (function(){var currentTime = new Date();var now=currentTime.getFullYear();var year=2000;var ret=[];while(year<=now){ret.push([now]);now--;}return ret;})(),
    //yearsUrl :"http://figisapps.fao.org/figis/ws/vme/webservice/references/years/en/list",
    yearsUrl :FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/years/en/list",
	
    //searchUrl: "http://figisapps.fao.org/figis/ws/vme/webservice/search", // see options parameter for Ext.Ajax.request
    searchUrl: FigisMap.geoServerBase + "/figis/ws/vme/webservice/search" // see options parameter for Ext.Ajax.request
    
    //factsheetCCAMLR : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/CCAMLR/scope/Regulatory/vmes",
    /*factsheetCCAMLR : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/CCAMLR/scope/Regulatory/vmes",
    
    //factsheetGFCM   : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/GFCM/scope/Regulatory/vmes",
    factsheetGFCM   : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/GFCM/scope/Regulatory/vmes",
    
    //factsheetNAFO   : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/NAFO/scope/Regulatory/vmes",
    factsheetNAFO   : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/NAFO/scope/Regulatory/vmes",
    
    //factsheetNEAFC  : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/NEAFC/scope/Regulatory/vmes",
    factsheetNEAFC  : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/NEAFC/scope/Regulatory/vmes",
    
    //factsheetSEAFO  : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/SEAFO/scope/Regulatory/vmes",
    factsheetSEAFO  : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/SEAFO/scope/Regulatory/vmes",
    
    //factsheetWECAFC : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/WECAFC/scope/Regulatory/vmes",
    factsheetWECAFC : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/WECAFC/scope/Regulatory/vmes",
    
    //factsheetSPRFMO : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/SPRFMO/scope/Regulatory/vmes"
    factsheetSPRFMO : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/SPRFMO/scope/Regulatory/vmes",
    
    //factsheetNPFC : "http://figisapps.fao.org/figis/ws/vme/webservice/owner/NPFC/scope/Regulatory/vmes"
    factsheetNPFC : FigisMap.geoServerBase + "/figis/ws/vme/webservice/owner/NPFC/scope/Regulatory/vmes"*/    
};

Vme.data.extensions ={
	FeatureInfo:{
		VmeStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',
				fields: [
					{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
                    {name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'status', 	 mapping: 'attributes.STATUS'},
                    {name: 'year', mapping: 'attributes.year'},
                    {name: 'feature_year', mapping: 'attributes.YEAR'},
                    {name: 'VME_AREA_TIME', mapping: 'attributes.VME_AREA_TIME'},
                    {name: 'SHAPE_AREA', mapping:'attributes.SHAPE_AREA'},
                    {name: 'envelope', mapping: 'attributes.envelope'},
					{name: 'localname',  mapping: 'attributes.localName'},
					{name: 'factsheetUrl',  mapping: 'attributes.factsheetURL'},
                    {name: 'pdfURL',  mapping: 'attributes.pdfURL'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vmeType', mapping: 'attributes.vmeType'},
					{name: 'owner', mapping: 'attributes.owner'},
                    {name: 'owner_acronym', mapping: 'attributes.OWNER'},
                    {name: 'validityPeriodFrom', mapping: 'attributes.validityPeriodStart'},
					{name: 'validityPeriodTo', mapping: 'attributes.validityPeriodEnd'},
					{name: 'geo_ref', mapping: 'attributes.geoArea'},
                    {name: 'feature_geo_ref', mapping: 'attributes.GEOREF'},
                    {name: 'feature_localname',  mapping: 'attributes.LOCAL_NAME'},
                    {name: 'reviewYear',  mapping: 'attributes.reviewYear'},
                    {name: 'surface', mapping: 'attributes.SURFACE'},
                    {name: 'measure', mapping: 'attributes.measure'}
                    
					/*{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
                    {name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'status', 	 mapping: 'attributes.STATUS'},
                    {name: 'year', mapping: 'attributes.year'},
                    {name: 'VME_AREA_TIME', mapping: 'attributes.VME_AREA_TIME'},
                    {name: 'SHAPE_AREA', mapping:'attributes.SHAPE_AREA'},
                    {name: 'envelope', mapping: 'attributes.envelope'},
					{name: 'localname',  mapping: 'attributes.localName'},
					{name: 'factsheetUrl',  mapping: 'attributes.factsheetUrl'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vmeType', mapping: 'attributes.vmeType'},
					{name: 'owner', mapping: 'attributes.owner'},
                    {name: 'owner_acronym', mapping: 'attributes.OWNER'},
                    {name: 'validityPeriodFrom', mapping: 'attributes.validityPeriodFrom'},
					{name: 'validityPeriodTo', mapping: 'attributes.validityPeriodTo'},
					{name: 'geo_ref', mapping: 'attributes.geoArea'},
                    {name: 'surface', mapping: 'attributes.SURFACE'}*/
				],
				idProperty: 'fid'			
			})
		}),
        
		RfbStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',
				fields: [
					{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
                    {name: 'rfb',     mapping: 'attributes.RFB'},                    
                    {name: 'vme_id',     mapping: 'attributes.VME_ID'},
                    {name: 'area_type',     mapping: 'attributes.AREATYPE'},
                    {name: 'defrule',     mapping: 'attributes.DEFRULE'},
                    {name: 'disporder',     mapping: 'attributes.DISPORDER'},
                    {name: 'fill',     mapping: 'attributes.FILL'},
                    {name: 'stroke',     mapping: 'attributes.STROKE'},
                    {name: 'ancfeature',     mapping: 'attributes.ANCFEATURE'},
                    {name: 'SHAPE_AREA', mapping:'attributes.SHAPE_AREA'},
                    {name: 'SHAPE_LENG', mapping:'attributes.SHAPE_LENG'}
				],
				idProperty: 'fid'			
			})
		}),        
		
		EncountersStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',		
				fields: [
					{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
					{name: 'object_id',  mapping: 'attributes.OBJECTID'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'aggregation', 	 mapping: 'attributes.AGREGATION'},
					{name: 'year', mapping: 'attributes.YEAR'},
					{name: 'taxa', mapping: 'attributes.TAXA'},
					{name: 'quantity', mapping: 'attributes.QUANTITY'},
					{name: 'unit', mapping: 'attributes.UNIT'},
					{name: 'owner', mapping: 'attributes.OWNER'},
					{name: 'geo_ref', mapping: 'attributes.geoArea'}
				],
				idProperty: 'fid'			
			})
		}),
		SurveyDataStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',
				fields: [
		    	{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
					{name: 'object_id',  mapping: 'attributes.OBJECTID'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'aggregation', 	 mapping: 'attributes.AGREGATION'},
					{name: 'year', mapping: 'attributes.YEAR'},
					{name: 'taxa', mapping: 'attributes.TAXA'},
					{name: 'quantity', mapping: 'attributes.QUANTITY'},
					{name: 'unit', mapping: 'attributes.UNIT'},
					{name: 'owner', mapping: 'attributes.OWNER'},
					{name: 'geo_ref', mapping: 'attributes.geoArea'}					
				],
				idProperty: 'fid'			
			})
		}),
		AggregateDataStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',
				fields: [
				    {name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
					{name: 'resolution',  mapping: 'attributes.RESOLUTION'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'count', 	 mapping: 'attributes.COUNT'},
					{name: 'year', mapping: 'attributes.YEAR'},
					{name: 'owner', mapping: 'attributes.OWNER'},
					{name: 'geo_ref', mapping: 'attributes.geoArea'}					
				],
				idProperty: 'fid'			
			})
		}),
		FootprintStore : Ext.extend(Ext.data.JsonStore,{
			reader : new Ext.data.JsonReader({
				root:'',
				fields: [
					{name: 'id', mapping: 'fid'},
					{name: 'geometry', mapping: 'geometry'},
					{name: 'localname',  mapping: 'attributes.LOCAL_NAME'},
					{name: 'bbox',		mapping: 'bounds'},
					{name: 'vme_id',     mapping: 'attributes.VME_ID'},
					{name: 'status', 	 mapping: 'attributes.STATUS'},
					{name: 'year', mapping: 'attributes.YEAR'},
					{name: 'type', mapping: 'attributes.VME_TYPE'},
					{name: 'owner', mapping: 'attributes.OWNER'},
					{name: 'obj_id', mapping: 'attributes.OBJECTID'},
					{name: 'geo_ref', mapping: 'attributes.GEOREF'},
                    {name: 'surface', mapping: 'attributes.SURFACE'}					
				],
				idProperty: 'fid'			
			})
		})	
	},
	WFS:{
		/**
		 * Vme.data.extensions.WFS.WFSStore: WFS generic store 
		 * you can replace fields to get the needed properties
		 * (e.g. {name:'myprop',mapping: 'properties.myprop'
		 * properties:
		 * * typeName - the featureType  
		 *
		 */
		WFSStore : Ext.extend(Ext.ux.LazyJsonStore,{
			//combo:this,
			
			typeName: FigisMap.fifao.vme_cl,
			reader: new Ext.data.JsonReader({
				root:'features',
				idProperty:'id', 
				fields: [
					{name: 'id', mapping: 'id'},
					{name: 'geometry', mapping: 'geometry'},
					{name: 'properties',  mapping: 'properties'},
					{name: 'type',		mapping: 'type'}
				]
			}),
			messageProperty: 'crs',
			autoLoad: true,
			
			
			proxy : new Ext.data.HttpProxy({
				method: 'GET',
				url: FigisMap.rnd.vars.ows

			}),
			
			recordId: 'id',
			paramNames:{
				start: "startindex",
				limit: "maxfeatures",
				sort: "sortBy"
			},
			
			baseParams:{
				service:'WFS',
				version:'1.0.0',
				request:'GetFeature',
				outputFormat:'json',
				srs:'EPSG:4326'
			},
			listeners:{
				beforeload: function(store,options){
					if(!options.typeName){
						store.setBaseParam( 'typeName',store.typeName);
						
					}
				}
			}
		})
	}
};
/*
//get georeferences
var MarineAreas = new Vme.data.extensions.WFS.WFSStore({typeName:'fifao:oceans_'});
MarineAreas.load({
	callback:function(records,options,success){
		var georeferences = {};
		var GeoJsonFormat = new OpenLayers.Format.GeoJSON();
		records= this.reader.jsonData.features;
		for (var i=0; i<records.length; i++){
			var selectedRecord = records[i]; 
			var geoJsonGeom= selectedRecord["geometry"];
			var geom = GeoJsonFormat.read(geoJsonGeom, "Geometry");
			var name = selectedRecord["properties"].AREA_N;
			georeferences[name] = {
				zoomExtent:geom.getBounds().toBBOX()
			};
			
		}
		console.log (JSON.stringify(georeferences));
	}
});
*/
/**
 * Stores for data for Vme components
 */
Vme.data.stores = {
	rfmoStore:  new Ext.data.JsonStore({
        //mode: "local",
        url: Vme.data.models.rfmosUrl,
        autoLoad: true,
        remoteSort: false,
        idProperty: 'id',        
        root: 'resultList',
        fields: [ "id", "name", "acronym" ]// "lang"
        //sortInfo: {field: "name", direction: "ASC"}             
    }),

	areaTypeStore: new Ext.data.JsonStore({
        url: Vme.data.models.areaTypesUrl,
        autoLoad: true,
        remoteSort: false,
        root: 'resultList',
        fields: [ "id", {name:"displayText", mapping:"name"} ] // "lang"
    }),
    
	VmeStatusStore: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'displayText'
        ],
		data: Vme.data.models.VmeStatuses

    }),
    
	VmeCriteriaStore: new Ext.data.JsonStore({
        url: Vme.data.models.VmeCriteriaUrl,
        autoLoad: true,
        remoteSort: false,
        root: 'resultList',
        fields: [ "id", {name:"displayText", mapping:"name"} ] // "lang"
    }),

	yearStore: new Ext.data.JsonStore({
        url: Vme.data.models.yearsUrl,
        autoLoad: true,
        remoteSort: false,
        root: 'resultList',
        fields: [ "id", {name:"year", mapping:"name"} ] // "lang"
    }),
    
    // LIST OF RFB FACTSHEET URL
    
    /*rfbStoreCCAMLR: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetCCAMLR,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),
    
    rfbStoreGFCM: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetGFCM,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),

    rfbStoreNAFO: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetNAFO,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),

    rfbStoreNEAFC: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetNEAFC,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),

    rfbStoreSEAFO: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetSEAFO,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),

    rfbStoreWECAFC: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetWECAFC,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),

    rfbStoreSPRFMO: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetSPRFMO,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),   

    rfbStoreNPFC: new Ext.data.JsonStore({
        url: Vme.data.models.factsheetNPFC,
        autoLoad: false,
        remoteSort: false,
        root: 'vmeDto',                      
        fields: ['vmeId',{name: "factsheetUrl", mapping: "factsheetUrl"}]          
    }),*/     
                    
	SearchResultStore:new Ext.ux.LazyJsonStore({

		method:'GET',
		
		root:'resultList',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			//{name: 'id', mapping: 'id'},
			{name: 'localname',  mapping: 'localName'},
			{name: 'factsheetUrl',		mapping: 'factsheetUrl'},
			{name: 'vme_id',     mapping: 'vmeId'},
			{name: 'year', mapping: 'year'},
			{name: 'vmeType', mapping: 'vmeType'},
			{name: 'owner', mapping: 'owner'},
            {name: 'geoArea', mapping: 'geoArea'},
            {name: 'envelope', mapping: 'envelope'},
            {name: 'geographicFeatureId', mapping: 'geographicFeatureId'},
            {name: 'validityPeriodFrom', mapping: 'validityPeriodFrom'},
            {name: 'validityPeriodTo', mapping: 'validityPeriodTo'}
			
		],
		
		proxy : new Ext.data.HttpProxy({
            timeout: 36000,
            success: function (result) {
            },            
            failure: function (result) {
                var dataView = Vme.form.widgets.SearchResults;
                dataView.refresh();
            },            
            method: 'GET',
            url: Vme.data.models.searchUrl // see options parameter for Ext.Ajax.request
        }),
		
		
		recordId: 'fid',
		paramNames:{
			start: "start",
			limit: "rows",
			sort: "sortBy"
		}
	}),
	
	EncountersStore:new Ext.ux.LazyJsonStore({
		//combo:this,
		method:'GET',
		
		root:'features',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			{name: 'id', mapping: 'fid'},
			{name: 'geometry', mapping: 'geometry'},
			{name: 'bbox',		mapping: 'properties.bbox'},
			{name: 'vme_id',     mapping: 'properties.VME_ID'},
			{name: 'taxa', 	 mapping: 'properties.TAXA'},
			{name: 'QUANTITY', mapping: 'properties.QUANTITY'},
			{name: 'unit', mapping: 'properties.UNIT'}

		],
		url: FigisMap.rnd.vars.ows,
		recordId: 'fid',
		paramNames:{
			start: "startindex",
			limit: "maxfeatures",
			sort: "sortBy"
		},
		baseParams:{
			service:'WFS',
			version:'1.0.0',
			request:'GetFeature',
			typeName: 'fifao:Encounters2',
			outputFormat:'json',
			sortBy: 'VME_ID',
			srs:'EPSG:4326'
			
		
		},
		listeners:{
			beforeload: function(store){
				
			
			}
		}
	}),
	SurveyDataStore:new Ext.ux.LazyJsonStore({
		//combo:this,
		method:'GET',
		
		root:'features',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			{name: 'id', mapping: 'fid'},
			{name: 'geometry', mapping: 'geometry'},
			{name: 'bbox',		mapping: 'properties.bbox'},
			{name: 'vme_id',     mapping: 'properties.VME_ID'},
			{name: 'taxa', 	 mapping: 'properties.TAXA'},
			{name: 'QUANTITY', mapping: 'properties.QUANTITY'},
			{name: 'unit', mapping: 'properties.UNIT'}

		],
		url: FigisMap.rnd.vars.ows,
		recordId: 'fid',
		paramNames:{
			start: "startindex",
			limit: "maxfeatures",
			sort: "sortBy"
		},
		baseParams:{
			service:'WFS',
			version:'1.0.0',
			request:'GetFeature',
			typeName: 'fifao:SurveyData',
			outputFormat:'json',
			sortBy: 'VME_ID',
			srs:'EPSG:4326'
			
		
		},
		listeners:{
			beforeload: function(store){
				
			
			}
		}
	})

};
