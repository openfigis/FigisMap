/*
	vme-data.js
	data model and stores for VME using Extjs
	Authors:
		Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/

var VMEData = new Object();

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




/** 
 * VMEData.templates contains templates and base Extjs Stores, models to load Vme data
 */
VMEData.templates = {
		/** VMEData.templates.searchResult
		 * displays search results with utilities to display human readable fields
	     	 */
		searchResult: new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result">' +
						'<em>Name: </em><span class="searchResultValue">{localname}</span><br/>'+				
						//'<em>Validity: </em><span class="searchResultValue">{[this.getValidity(values)]}</span> <br/> '+	
						'<em>Measure first applied in: </em><span class="searchResultValue">{[this.getValidity(values, true)]}</span> <br/> '+	
						//'<em>Year: </em><span class="searchResultValue">{year}</span> <br/> '+
						//'<em>Management Body/Authority(ies): </em><span class="searchResultValue">{owner}</span><br/>'+
						'<em>Management Body/Authority: </em><span class="searchResultValue">{owner}</span><br/>'+
                        
						//buttons
						'<a onclick="VMESearch.clickOnFeature(\'{geographicFeatureId}\',{year},false)">'+
                        			'<img title="More information" src="assets/figis/vme/img/icons/buttoninfo.png" />'+
                        			'</a> '+
                        			'<a onclick="VMESearch.clickOnFeature(\'{geographicFeatureId}\',{year},true)">'+
                        			'<img title="Zoom to area" src="assets/figis/vme/img/icons/buttonzoom.png" />'+
                        			'</a> '+
                        			'<a onClick="VMESearch.factsheetRel(\'{[this.getFactsheetUrl(values)]}\');">'+
                        			'<img title="View fact sheet" src="assets/figis/vme/img/icons/buttonfactsheet.png" />'+
                        			'</a> '+
					'</div>'+
				'</tpl>',
				{
				compiled:true,
                    		getFactsheetUrl: function(values){

                        		if(values.factsheetUrl){
                            			return(values.factsheetUrl);
                        		}else{
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
			)
};

VMEData.constants = { pageSize:8 }


/**
 * Models: base tipes for Vme for Extjs Stores 
 *
 */
VMEData.models = {
	rfmosUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/authority/en/list",
    areaTypesUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/type/en/list",
    VmeStatusesUrl : FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/authority/en/list",
    VmeCriteriaUrl :FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/criteria/en/list",
    yearsUrl :FigisMap.geoServerBase + "/figis/ws/vme/webservice/references/years/en/list",
    searchUrl: FigisMap.geoServerBase + "/figis/ws/vme/webservice/search" // see options parameter for Ext.Ajax.request
   
};

/**
 * Stores for data for Vme components
 */
VMEData.stores = {
	rfmoStore:  new Ext.data.JsonStore({
        //mode: "local",
        url: VMEData.models.rfmosUrl,
        autoLoad: true,
        remoteSort: false,
        idProperty: 'id',        
        root: 'resultList',
        fields: [ "id", "name", "acronym" ]// "lang"
        //sortInfo: {field: "name", direction: "ASC"}             
    }),

	areaTypeStore: new Ext.data.JsonStore({
        url: VMEData.models.areaTypesUrl,
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
		data: VMEData.models.VmeStatuses

    }),
    
	VmeCriteriaStore: new Ext.data.JsonStore({
        url: VMEData.models.VmeCriteriaUrl,
        autoLoad: true,
        remoteSort: false,
        root: 'resultList',
        fields: [ "id", {name:"displayText", mapping:"name"} ] // "lang"
    }),

	yearStore: new Ext.data.JsonStore({
        url: VMEData.models.yearsUrl,
        autoLoad: true,
        remoteSort: false,
        root: 'resultList',
        fields: [ "id", {name:"year", mapping:"name"} ] // "lang"
    }),
    
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
                var dataView = VMESearch.form.widgets.SearchResults;
                dataView.refresh();
            },            
            method: 'GET',
            url: VMEData.models.searchUrl // see options parameter for Ext.Ajax.request
        }),
		
		recordId: 'fid',
		paramNames:{
			start: "start",
			limit: "rows",
			sort: "sortBy"
		}
	})
	
	
};
