/*
 *  Copyright (C) 2007 - 2012 GeoSolutions S.A.S.
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
 * Login Widget and button.
 * Author: Lorenzo Natali (GeoSolutions S.A.S.)
 * 
 *
 */

Ext.onReady(function(){
	//status variable,
	FigisMap.rnd.status = {
		logged : false
	};
	
	//
	//Login window
	//
	FigisMap.loginWin= new Ext.Window({
		width: 250,
		title: "Login",
		closeAction: 'hide',
		modal: true,
		items:[{
			xtype: 'form',
			ref: 'form',
			bodyStyle:{
				padding: "10px"
				
			},
			items:[
			{
				ref: '../userField',
				xtype: 'textfield',
				fieldLabel: 'User',
				width: 100
			
			},{
				ref: '../passwordField',
				xtype: 'textfield',
				fieldLabel: 'Password',
				inputType: 'password',
				width: 100
			}	
			]
			
		}],
		 buttons: [
		 {
			text:'Login',
			ref: '../loginButton',
			iconCls: 'icon-login',
			handler: function(){
				FigisMap.submitLogin();
			}
		}],
        keys: [{ 
            key: [Ext.EventObject.ENTER],
            scope: this,
            handler: function(){
            	FigisMap.submitLogin();
        	}
        }],
		events:{
			login:true,logout:true
		
		}
	});
	
	/**
	 * logInOut toggles login/logout status
	 */
	FigisMap.logInOut = function(){
		if(FigisMap.rnd.status.logged){
			//logout
			Ext.Msg.show({
			   title:'Logout',
			   msg: 'Are you sure that you want to logout?',
			   buttons: Ext.Msg.YESNO,
			   fn: function(btn ){
					if(btn != 'yes') return;
					FigisMap.rnd.status.logged=false;
					//reset previous fields values
					FigisMap.loginWin.userField.setValue("");
					FigisMap.loginWin.passwordField.setValue("");
					//Remove User button and add login button
					Ext.DomHelper.overwrite(document.getElementById("loginContainer"),{html:'Login'});
					/*new Ext.Button({
						renderTo : 'loginContainer',
						handler : FigisMap.logInOut,
						text : 'Login',
						iconCls: 'icon-login'
					});
                    */
					//Ext.DomHelper.overwrite(document.getElementById("user"),{
					//	tag:'span',
					//	id:'user',
					//	'class':'user-login',
					//	html:''
					//});
				FigisMap.loginWin.fireEvent('logout');
				},
			   animEl: 'elId',
			   icon: Ext.MessageBox.QUESTION
			});
			
		}else{
			//login prompt
			FigisMap.loginWin.show();
		}
	};
	
	//add events login and logout
	FigisMap.loginWin.addEvents(FigisMap.loginWin.events);
	
	// This function checks the user/password
	FigisMap.submitLogin = function () {
			var w=FigisMap.loginWin;
			//that's only an exemple
			var user = w.userField.getValue();
			var password = w.passwordField.getValue();
			if(user =="admin" && password =="admin"){
				FigisMap.rnd.status.logged = true;
				//change login link
				//Ext.DomHelper.overwrite(document.getElementById("user"),{
				//	tag:'span',
				//	id:'user',
				//	'class':'user-logout',
				//	html:'Logged as <em>'+ user + '</em>'
				//});
				Ext.DomHelper.overwrite(document.getElementById("loginContainer"),{
					tag:'span',
					id:'login',
					//'class':'user-logout',
					//html:'<span id="usermenu"></span>',
                    html:'Logout'
				});
                /**
                 * to enable the user menu uncomment sp and html:'<span id="usermenu"></span>'
                 */
				/*var sp =  new Ext.Toolbar.SplitButton({
						text: user,
						//handler: onButtonClick,
						renderTo :'usermenu',
						tooltip: {text:'', title:'User settings'},
						iconCls: 'icon-user',
						// Menus can be built/referenced by using nested menu config objects
						menu : {
							items: [{
								iconCls: 'icon-logout',
								text:'Logout',
								handler: FigisMap.logInOut
							}]
						}
					});*/

				//fires event login
				w.fireEvent('login',user);
				//hide window
				w.hide();
			}else{
				
				Ext.Msg.show({
				   title:'Login Error',
				   msg: 'The username or password is not correct.',
				   buttons: Ext.Msg.OK,
				   icon: Ext.MessageBox.ERROR
				});
				w.userField.markInvalid();
				w.passwordField.markInvalid();			
			}
	};
	
	//Setup login button at startup
/*
	new Ext.Button({
		renderTo : 'loginContainer',
		handler : FigisMap.logInOut,
		text : 'Login',
		iconCls: 'icon-login'
	});
*/
});
 
