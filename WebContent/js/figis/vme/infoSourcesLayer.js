/*
 *  Copyright (C) 2007 - 2013 GeoSolutions S.A.S.
 *  http://www.geo-solutions.it
 *
 *  GPLv3 + Classpath exception
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
 /**
 * 
 * InfoSourceLayer display window.
 * 
 * Author: Lorenzo Pini (GeoSolutions S.A.S.)
 *
 */
Ext.IframeWindow = Ext.extend(Ext.Window, {
    onRender: function() {
        this.bodyCfg = {
            tag: 'iframe',
            src: this.src,
            cls: this.bodyCls,
            style: {
                border: '0px none'
            }
        };
        Ext.IframeWindow.superclass.onRender.apply(this, arguments);
        this.tbarDiv = Ext.get('topBar');
        this.mainDiv = Ext.get('main');
        this.disclaimerDiv = Ext.get('disclaimer');
        Ext.EventManager.onWindowResize(this.resizeHandler, this);

    },
	onDestroy: function(){
        Ext.EventManager.removeResizeListener(this.resizeHandler, this);
        
    },
	resizeHandler: function(w, h){
//         this.setPosition(this.tbarDiv.getX() -5 , this.tbarDiv.getY() + this.tbarDiv.getHeight() - 31 );
//         this.setWidth(this.mainDiv.getWidth() + 10 );
//         this.setHeight(this.mainDiv.getHeight() + this.tbarDiv.getHeight() - 49 );
		this.setPosition(10, 80 );
		this.setWidth(this.mainDiv.getWidth() - 20 );
		this.setHeight(mainDiv.getHeight() + bannerIframe.getHeight() - 100);
    }
});

Ext.onReady(function(){
    //
	//infoSourceLayer window
	//
    FigisMap.infoSourceLayers = function(InfoSourcesLayerUrl,addUrl){
        if(!InfoSourcesLayerUrl){
            InfoSourcesLayerUrl = FigisMap.geoServerBase + "/";
		}
		
        var tbarDiv = Ext.get('logo') || Ext.get('topBar');
        var mainDiv = Ext.get('main') || Ext.get('main_e');
		var bannerIframe = Ext.get('banner');
		
		var embeddedIframe = location.href.indexOf("index_e.html") != -1 ? true : false;
		
		var pars;
		if(embeddedIframe){
			pars = {
				x: tbarDiv.getX(),
				y: tbarDiv.getY() + tbarDiv.getHeight(),
				width: mainDiv.getWidth(),
				height: mainDiv.getHeight() + tbarDiv.getHeight() + 100,
			};
		}else{
			pars = {
				x: tbarDiv.getX() + 10,
				y: tbarDiv.getY() + tbarDiv.getHeight() + 80,
				width: mainDiv.getWidth() - 20,
				height: mainDiv.getHeight() + bannerIframe.getHeight() - 100,
			};	
		}				
		
        new Ext.IframeWindow(Ext.applyIf({
            id:'factsheetWindow',
			title: " <a style=\"position:absolute;right:60px;\" onclick=\"Ext.getCmp('factsheetWindow').close();\">&laquo;Back to map&nbsp;</a>",
            src: addUrl ? FigisMap.geoServerBase + "/" + InfoSourcesLayerUrl : InfoSourcesLayerUrl,
            closeAction: 'destroy',
            maximizable: false,
			maximized: false,
            draggable: false,
            resizable: false,
            shadow: false
        }, pars)).show();
    };
		
});
 
