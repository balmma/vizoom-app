/*
*	This code was written by Patrick Tremp for Vizoom in 2013
*/

// Variables
var ROOT = 'http://vizoom.smss.ch'; // root url
var events = new Array(); // a list of all events
var locations = new Array(); // a lost of all locations
var credentials; // the credentials, encoded
var user; // user info
var months = {"Jan":1, "Feb":2, "Mar":3, "Apr":4, "May":5, "Jun":6, "Jul":7, "Aug":8, "Sep":9, "Oct":10, "Nov":11, "Dec":12 };
var qrcode; // the current qrcode of an event
var fileEntry; // file entry used for storage with phonegap

// remove the 'x' button at the top of the login screen
$("#login").on("pagecreate", function() {
    if($("div:jqmData(role='header') a")[0].dataset.icon=="delete"){
		$("div:jqmData(role='header')")[0].removeChild($("div:jqmData(role='header') a")[0]);
	}
});

// function gets called, when DOM is ready 
$(document).ready(function() {  
	//click listeners
	$('#login_button').click(function(event){
		if($('#username').val() != "undefined"  && $('#username').val() != null && $('#password').val() != "undefined" && $('#password').val() != null && $('#username').val().length >0 && $('#password').val().length>0){
			login($('#username').val(),$('#password').val(), false);
		} else {
			$("#login_status")[0].innerHTML = "Please fill out all the form elements!";
		}
	}); 
	$('#register_button').click(function(event){
		$.mobile.changePage('#register', 'pop', true, true);
	}); 
	$('#register_send_button').click(function(event){
		register();
	}); 
	$("input[type=text]").click(function() { // to select the current content if onclick happens
	   $(this).select();
	});
	$("input[type=password]").click(function() { // to select the current content if onclick happens
	   $(this).select();
	});
	
	// try to load credentials from file and autologin
	if(typeof(Storage)!=="undefined")
	{
		if(localStorage.cred != "undefined" && localStorage.cred != null && localStorage.cred.length>0){
			credentials = localStorage.cred;
			login("","",true);
		} else {
			$.mobile.changePage('#login', 'pop', true, true);
		}
	} else {
		$.mobile.changePage('#login', 'pop', true, true);
	}
	
	// load credentials with phonegap
	//window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
	
});

// funtion to bind mobileinit event. 
$( document ).bind( 'mobileinit', function(){
  $.mobile.loader.prototype.options.text = "loading";
  $.mobile.loader.prototype.options.textVisible = false;
  $.mobile.loader.prototype.options.theme = "a";
  $.mobile.loader.prototype.options.html = "";
});

// helper function to get the events from server
function update_events() {
	$.ajax({
		url: ROOT + '/_rest/events',
		dataType: 'json',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(res){
			for (var i = 0; i < res.length; i++) {
				events[i] = res[i];
			}
		}
	});
}

// helper function to check wheater event a occurs after event b in time
function isTimeAfterOther(a, b) { 
	if( eval(a.start_time.substring(26, 30)) < eval(b.start_time.substring(26,30))) {
		return false;
	}
	if( months[a.start_time.substring(4,7)] < months[b.start_time.substring(4,7)] ) {
		return false;
	}
	if(eval(a.start_time.substring(8,10))<eval(b.start_time.substring(8,10))){
		return false;
	}
	if(eval(a.start_time.substring(11,13))<eval(b.start_time.substring(11,13))){
		return false;
	}
	if(eval(a.start_time.substring(14,16))<eval(b.start_time.substring(14,16))){
		return false;
	}
	return true;
}

// sort all the loaded events by date. 
function sortEventsByDate() {
	var myEvents = events, i=0, j=0, tmp;
	for(i=0;i<myEvents.length;i++){
		for(j=i;j<myEvents.length-1;j++){
			if(isTimeAfterOther(myEvents[j], myEvents[j+1])){
				tmp = myEvents[j+1];
				myEvents[j+1] = myEvents[j];
				myEvents[j] = tmp;
			}
		}
	}
	return myEvents;
}

// helper function to get the locations from server
function update_locations() {
	$.ajax({
		url: ROOT + '/_rest/locations',
		dataType: 'json',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(res){
			for (var i = 0; i < res.length; i++) {
				locations[i] = res[i];
			}
		}
	});
}

// helper function to update the login status
function update_login_status() {
	if(credentials.length>0){
		$('#user_info_welcome_message')[0].innerHTML = "You are logged in as " + $('#username').val() + ".";
		$('#login_out_button')[0].innerHTML = "Logout";
		$('#login_out_button')[0].setAttribute("href", "");
		$('#login_out_button')[0].setAttribute("onclick", "logout()");
	} else {
		$('#user_info_welcome_message')[0].innerHTML = "You are logged out. Please log in below.";
		$('#login_out_button')[0].innerHTML = "Login";
		$('#login_out_button')[0].setAttribute("href", "#login");
		$('#login_out_button')[0].setAttribute("onclick", "");
	}
}

// helper function to fill and display the events list 
function display_events(list_name, nr_of_items) {
	var list = $("#"+list_name)[0], s = "", i, event;
	if(events.length==0){
		(nr_of_items==0) ? show_events() : load_upcoming_events();
		return;
	}
	events = sortEventsByDate();
	if(nr_of_items==0 || nr_of_items>events.length)
		nr_of_items = events.length;
	for (i = 0; i < nr_of_items; i++) {
		s += "<li data-corners=\"false\" data-shadow=\"false\" data-iconshadow=\"true\" data-wrapperels=\"div\" data-icon=\"arrow-r\" data-iconpos=\"right\" data-theme=\"c\" class=\"ui-btn ui-btn-icon-right ui-li-has-arrow ui-li ui-li-has-thumb ui-btn-up-c\"><div class=\"ui-btn-inner ui-li\"><div class=\"ui-btn-text\"><a href=\"#event_detail\" data-transition=\"slide\" class=\"ui-link-inherit\" onclick=\"display_event_detail('" + events[i].href + "')\"><img id=\"" + list_name + events[i].id + "\" class=\"ui-li-thumb\" width=\"70px\"><h3 class=\"ui-li-heading\">" + events[i].name + "</h3><p class=\"ui-li-desc\">" + events[i].location.name + ", " + events[i].start_time.substring(0,16) + "</p>	</a></div><span class=\"ui-icon ui-icon-arrow-r ui-icon-shadow\">&nbsp;</span></div></li>";
		$.ajax({
			url: ROOT + events[i].href,
			dataType: 'json',
			headers: {'Authorization': 'Basic ' + credentials},
			success: function(res){
				var img;
				if($("#eventlist" + res.id).length != 0){
					img = $("#eventlist" + res.id)[0];
					img.setAttribute("src", ROOT + res.images[0].thumbnail.src);
				}
				if($("#upcoming_eventlist" + res.id).length != 0){
					img = $("#upcoming_eventlist" + res.id)[0];
					img.setAttribute("src", ROOT + res.images[0].thumbnail.src);
				}
			}
		});
	}
	list.innerHTML = s;
}

// helper function to fill and display the my events list 
function display_my_events(list_name) {
	var list = $("#"+list_name)[0], s = "", i, event, count=0;
	events = sortEventsByDate();
	for (i = 0; i < events.length; i++) {
		if(events[i].participation_status == "confirmed_as_friend" ){
			count++;
			s += "<li data-corners=\"false\" data-shadow=\"false\" data-iconshadow=\"true\" data-wrapperels=\"div\" data-icon=\"arrow-r\" data-iconpos=\"right\" data-theme=\"c\" class=\"ui-btn ui-btn-icon-right ui-li-has-arrow ui-li ui-li-has-thumb ui-btn-up-c\"><div class=\"ui-btn-inner ui-li\"><div class=\"ui-btn-text\"><a href=\"#event_detail\" data-transition=\"slide\" class=\"ui-link-inherit\" onclick=\"display_event_detail('" + events[i].href + "')\"><img id=\"" + list_name + events[i].id + "\" class=\"ui-li-thumb\"width=\"70px\"><h3 class=\"ui-li-heading\">" + events[i].name + "</h3><p class=\"ui-li-desc\">" + events[i].location.name + "</p>	</a></div><span class=\"ui-icon ui-icon-arrow-r ui-icon-shadow\">&nbsp;</span></div></li>";
			$.ajax({
				url: ROOT + events[i].href,
				dataType: 'json',
				headers: {'Authorization': 'Basic ' + credentials},
				success: function(res){
					var img;
					if($("#participating_eventlist" + res.id).length != 0){
						img = $("#participating_eventlist" + res.id)[0];
						img.setAttribute("src", ROOT + res.images[0].thumbnail.src);
					}
				}
			});
		}
	}
	list.innerHTML = s;
	if(count==0){
		$("#myevents_status_message")[0].innerHTML = "No events selected yet.";
	} else {
		$("#myevents_status_message")[0].innerHTML = "";
	}
}

// helper function to fill and display the upcoming events list 
function display_locations(list_name) {
	var list = $("#"+list_name)[0], s = "", i, event;
	for (i = 0; i < locations.length; i++) {
		s += "<li data-corners=\"false\" data-shadow=\"false\" data-iconshadow=\"true\" data-wrapperels=\"div\" data-icon=\"arrow-r\" data-iconpos=\"right\" data-theme=\"c\" class=\"ui-btn ui-btn-icon-right ui-li-has-arrow ui-li ui-li-has-thumb ui-btn-up-c\"><div class=\"ui-btn-inner ui-li\"><div class=\"ui-btn-text\"><a href=\"#location_detail\" data-transition=\"slide\" class=\"ui-link-inherit\" onclick=\"display_location_detail('" + locations[i].href + "')\"><img src=\"" + ROOT + locations[i].logo.src + "\" class=\"ui-li-thumb\" width=\"70px\"><h3 class=\"ui-li-heading\" >" + locations[i].name + "</h3><p class=\"ui-li-desc\" id=\"" + locations[i].id + "\"></p>	</a></div><span class=\"ui-icon ui-icon-arrow-r ui-icon-shadow\">&nbsp;</span></div></li>";
		$.ajax({
			url: ROOT + locations[i].href,
			dataType: 'json',
			headers: {'Authorization': 'Basic ' + credentials},
			success: function(res){
				var element = $("#" + res.id)[0];
				element.innerHTML = res.street + ", " + res.city;
			}
		});
	}
	list.innerHTML = s;
}

// helper function to load the events. 
function show_events() {
	update_events();
	window.setTimeout(function(){display_events("eventlist", 0)},500);
}

// helper function to load all my events. 
function show_my_events() {
	update_events();
	window.setTimeout(function(){display_my_events("participating_eventlist")},500);
}

// helper function to load the location list. 
function show_locations() {
	update_locations();
	window.setTimeout(function(){display_locations("locationlist")},500);
}

// helper function to load the upcoming events. 
function load_upcoming_events() { 
	update_events();
	window.setTimeout(function(){display_events("upcoming_eventlist", 5)},500);
}

// loads the qr code image
function load_qrcode() {
	$("#qr_code")[0].setAttribute("src", qrcode);
	$("#qr_code").css("width", "100%");
}

// helper function to fill the event detail page
function display_event_detail(event_href) {
	$.ajax({
		url: ROOT + event_href,
		dataType: 'json',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(res){
			var artists = "", genres = "", i;
			$('#event_detail_title').html('<h1>' + res.name + '</h1>');
			$('#event_detail_time').html('<br/><b>Starts at:</b> ' + res.start_time.substring(0,16) + ' <br/><b>Finishes at:</b> ' + res.end_time.substring(0,16));
			$('#event_detail_location').html("<b>Location:</b> <a href=\"#location_detail\"  data-transition=\"slide\" onclick=\"display_location_detail('" + res.location.href + "')\">" + res.location.name + '</a>');
			for(i = 0; i < res.artists.length; i++){
				artists += '<li>' + res.artists[i].name + '</li>';
			}
			$('#event_detail_line_up').html('<b>Line up:</b> <br/><ul>' + artists + '</ul>');
			$('#event_detail_image').html('<img src=\"' + ROOT + res.images[0].normal.src + '\" />');
			$('#event_detail_description').html("<b>Description:</b><br/>"+res.description);
			for(i = 0; i < res.genres.length; i++){
				genres += '<li>' + res.genres[i].name + '</li>';
			}
			$('#event_detail_information').html('<b>Min age:</b> ' + res.min_age + '<br/><b>Music genre:</b> <br/><ul>' + genres + '</ul><br/><b>Price:</b> ' + (res.price - res.friend_discount) + '.- instead of <strike>' + res.price + '.-</strike>');
			if(res.participation_status == "no_participation_yet"){
				$('#event_detail_status').html('<b>Status:</b> You are not participating. <a onclick=\"participate(\'' + res.actions.participate + '\', \''+res.id+ '\')\" data-role="button" data-theme="e" data-mini="true">Registrate on friendlist.</a>');
			}
			else if(res.participation_status == "confirmed_as_friend") {
				qrcode = res.qr_code;
				$('#event_detail_status').html('<b>Status:</b> You are confirmed as a friend. <a href=\"#myCode\" onclick=\"load_qrcode()\" data-role="button" data-theme="d" data-mini="true">Show QR Code</a><a href=\"#event\" onclick=\"stop_participating(\'' + res.actions.decline + '\', \''+res.id+'\')\" data-role="button" data-theme="e" data-mini="true">Remove event</a>');
			}
			else{
				 // TODO: all the others...
			}
			$('#event_detail_status').trigger('create');
			$.mobile.changePage('#event_detail', 'slide', true, true);
		}
	});
}

// helper function to fill the detail location page
function display_location_detail(location_href) {
	$.ajax({
		url: ROOT + location_href,
		dataType: 'json',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(res){
			var images = "", i;
			$('#location_detail_title').html('<h2>' + res.name + '</h2>');
			$('#location_detail_logo').html('<img src="'+ROOT + res.logo.src+'"></img>');
			$('#location_detail_address').html('<b>Address: </b><br/><div style="margin-left:10px">' + res.street + '<br/>' + res.zip + " " + res.city + '<br/>' + res.country + '</div>');
			$('#location_detail_description').html('<br/><b>Description:</b>' + res.description);
			for(i = 0; i < res.images.length; i++){
				images += '<img src=\"' + ROOT + res.images[i].popup.src + '\" width=\"'+(screen.width-30)+'px;\"/><br/>';
			}
			$('#location_detail_images').html('<b>Images:</b> <br/>' + images);

			$.mobile.changePage('#location_detail', 'slide', true, true);
		}
	});
}

// called when the user submits setting changes
function save_settings() {
	alert("Not yet implemented");
}

// login a user and save the credentials to the local storage. 
function login(username,password,autologin){
	if(!autologin){
		credentials = $.base64.encode(username+":"+password);
	}
	if($('#checkbox-savePassword')[0].checked){
		// Save to file for later
		if(typeof(Storage)!=="undefined")
		{
			localStorage.cred = credentials; 
		}
	}
	$.ajax({
	url: ROOT + '/_rest/events',
	dataType: 'json',
	headers: {'Authorization': 'Basic ' + credentials},
	success: function(res){
		if(res == "Authorization failed"){
			$('#login_status').html("Ungültiges Login");
		} else {
			$.mobile.changePage('#home', 'pop', true, true);
		}
		update_login_status();
		update_events();
		update_locations();
		load_upcoming_events();
		if($('#checkbox-savePassword').checked){
			saveToFile();
		}
		$('#login_status').html("");
	},
	error: function (request, status, error) { // TODO status: 0, statusText: error
		console.log(request);
		if(request.responseText.indexOf("uthorization failed")>0){
			$('#login_status').html("Ungültiges Login");
		} else {
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	}
	});
}

// register a new user
function register() {
	if($('#firstname').val() == "" || $('#surname').val() == "" || $('#street').val() == "" || $('#zip').val() == "" || $('#town').val() == "" || $('#tel').val() == ""){
		$('#register_error_status')[0].innerHTML = "Please fill out all the fields";
		return;
	}
	else if($('#reg_password').val() == "" || $('#reg_password').val() != $('#reg_repeat_password').val()){
		$('#register_error_status')[0].innerHTML = "The passwords do not match.";
		return;
	} else if($('#checkbox-agree')[0].checked == false){
		$('#register_error_status')[0].innerHTML = "Please accept the AGB.";
		return;
	}
	var gender = $('#title').selectmenu("selected", true).val();
	var firstname = $('#firstname').val();
	var surname = $('#surname').val();
	var street = $('#street').val();
	var citycode = $('#zip').val();
	var city = $('#town').val();
	var country = $('#country').selectmenu("selected", true).val();
	var mobile = $('#tel').val();
	var email = $('#email').val();
	var birthday = $('#date').val();
	var password = $('#reg_password').val();
	var password_repeat = $('#reg_repeat_password').val();
	var agb_agree = $('#checkbox-agree')[0].checked;
	// Now send to the server
	$.ajax({
		url: ROOT + "/_rest/user",
		type: 'post',
		data: "gender="+encodeURIComponent(gender)+"&email="+encodeURIComponent(email)+"&surname="+encodeURIComponent(surname)+"&firstname="+encodeURIComponent(firstname)+"&birthday="+encodeURIComponent(birthday)+"&street="+encodeURIComponent(street)+"&citycode="+encodeURIComponent(citycode)+"&city="+encodeURIComponent(city)+"&country="+encodeURIComponent(country)+"&mobile="+encodeURIComponent(mobile)+"&password="+encodeURIComponent(password)+"&repeat_password="+encodeURIComponent(password_repeat)+"&accept_agbs="+encodeURIComponent(agb_agree),
		success: function(data) {
			$.mobile.changePage('#login', 'pop', true, true);
			$('#login_status')[0].innerHTML = 'Successfully registered!<br/>You may now log yourself in.';
			$('#register_error_status')[0].innerHTML = "";
			$.mobile.silentScroll(0);
		},
		error: function (request, status, error) {
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// called when the user hits the logout button. remove the credentials from local storage
function logout(){
	credentials = "";
	if(typeof(Storage)!=="undefined")
	{
		// remove saved entry.
		if(typeof(Storage)!=="undefined")
		{
			localStorage.cred = credentials; 
		}
	}
	$.mobile.changePage('#login', 'pop', true, true);
	update_login_status();
}

function loadUser(){
	$.ajax({
		url: ROOT + '/_rest/user',
		dataType: 'json',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(res){
			user = res;
		},
		error: function (request, status, error) {
			console.log("could not load user info");
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// helper function to load the user info data
function fillUserInfoEditing(){
	loadUser();
	window.setTimeout(function(){loadUserInfoEditing()},300);
}

// helper function to load the user info data
function loadUserInfoEditing() {
	if(user==null || user=="undefined") {
		fillUserInfoEditing();
		return;
	}
	
	// error
	$('#update_error_status')[0].innerHTML = "";
	// title
	if(user.gender!=null && user.gender!="undefined" && user.gender.length>0){
		if(user.gender=="m"){
			$("#update_title").val("mr").attr("selected", true).siblings('option').removeAttr('selected');
		} else {
			$("#update_title").val("mrs").attr("selected", true).siblings('option').removeAttr('selected');
		}
		$("#update_title").selectmenu("refresh", true);
	}
	// firstname
	if(user.firstname!=null && user.firstname!="undefined" && user.firstname.length>0){
		$("#update_firstname").val(user.firstname);
	}
	// surname
	if(user.surname!=null && user.surname!="undefined" && user.surname.length>0){
		$("#update_surname").val(user.surname);
	}
	// street
	if(user.street!=null && user.street!="undefined" && user.street.length>0){
		$("#update_street").val(user.street);
	}
	// zip
	if(user.citycode!=null && user.citycode!="undefined" && user.citycode.length>0){
		$("#update_zip").val(user.citycode);
	}
	// town
	if(user.city!=null && user.city!="undefined" && user.city.length>0){
		$("#update_town").val(user.city);
	}
	// country
	if(user.country!=null && user.country!="undefined" && user.country.length>0){
		if(user.country=="Schweiz") $("#update_country").val("switzerland");
		if(user.country=="Lichtenstein, Fürstentum") $("#update_country").val("liechtenstein");
		if(user.country=="Italien") $("#update_country").val("italy");
		if(user.country=="Deutschland") $("#update_country").val("germany");
		if(user.country=="Frankreich") $("#update_country").val("france");
		if(user.country=="Österreich") $("#update_country").val("austria");
		$("#update_country").selectmenu("refresh", true);
	}
	// tel
	if(user.mobile!=null && user.mobile!="undefined" && user.mobile.length>0){
		$("#update_tel").val(user.mobile);
	}
	// email
	if(user.email!=null && user.email!="undefined" && user.email.length>0){
		$("#update_email").val(user.email);
	}
	// birthday
	if(user.birthday!=null && user.birthday!="undefined" && user.birthday.length>0){
		$("#update_date").attr("max", getCurrentDate());
		$("#update_date").val(switchToJSDate(user.birthday));
	}
}

// called, when the user submits the changed user data
function update_user_info() {
	if($('#update_firstname').val() == "" || $('#update_surname').val() == "" || $('#update_street').val() == "" || $('#update_zip').val() == "" || $('#update_town').val() == "" || $('#update_tel').val() == ""){
		$('#update_error_status')[0].innerHTML = "Please fill out all the fields";
		$.mobile.silentScroll(0);
		return;
	}
	var gender = ($('#update_title').selectmenu("selected", true).val()=="mr")? "m" : "w";
	var firstname = $('#update_firstname').val();
	var surname = $('#update_surname').val();
	var street = $('#update_street').val();
	var citycode = $('#update_zip').val();
	var city = $('#update_town').val();
	var country = $('#update_country').selectmenu("selected", true).val();
	if(country=="switzerland") country = "Schweiz";
	if(country=="liechtenstein") country = "Lichtenstein, Fürstentum";
	if(country=="italy") country = "Italien";
	if(country=="germany") country = "Deutschland";
	if(country=="france") country = "Frankreich";
	if(country=="austria") country = "Österreich";
	var mobile = $('#update_tel').val();
	var email = $('#update_email').val();
	var birthday = switchToServerDate($('#update_date').val());
	$.ajax({
		url: ROOT + "/_rest/user",
		type: 'PUT',
		headers: {'Authorization': 'Basic ' + credentials},
		data: "gender="+encodeURIComponent(gender)+"&email="+encodeURIComponent(email)+"&surname="+encodeURIComponent(surname)+"&firstname="+encodeURIComponent(firstname)+"&birthday="+encodeURIComponent(birthday)+"&street="+encodeURIComponent(street)+"&citycode="+encodeURIComponent(citycode)+"&city="+encodeURIComponent(city)+"&country="+encodeURIComponent(country)+"&mobile="+encodeURIComponent(mobile),
		success: function(data) {
			if(data.errors!=null && data.errors!="undefined"){
				$('#update_error_status')[0].innerHTML = data.errors[0];
				$.mobile.silentScroll(0);
			} else {
				fillUserInfoEditing();
				window.setTimeout(function(){
					$('#update_error_status')[0].innerHTML = 'Successfully updated your data!';
					$.mobile.silentScroll(0);
				},400);
				$('#update_error_status')[0].innerHTML = 'Successfully updated your data!';
				$.mobile.silentScroll(0);
			}
		},
		error: function (request, status, error) {
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// called, when the user submits the changed the password form
function changePassword() {
	if(user==null || user == "undefined"){ // if we haven't loaded the user yet, do it and call us again
		loadUser();
		window.setTimeout(function(){changePassword()},300);
		return;
	}
	var newPw = $('#changePW_new_password').val();
	var repPw = $('#changePW_repeat_new_password').val();
	var oldPw = $('#changePW_old_password').val();
	if(oldPw == ""){
		$('#changePW_error_status')[0].innerHTML = "The old password field must be set."
		return;
	} else if(newPw == "" || newPw != repPw){
		$('#changePW_error_status')[0].innerHTML = "The passwords do not match."
		return;
	} else if($.base64.encode(user.email+":"+oldPw)!=credentials){
		$('#changePW_error_status')[0].innerHTML = "The old password is wrong.";
		return;
	}
	
	$.ajax({
		url: ROOT + "/_rest/user",
		type: 'PUT',
		headers: {'Authorization': 'Basic ' + credentials},
		data: "gender="+encodeURIComponent(user.gender)+"&email="+encodeURIComponent(user.email)+"&surname="+encodeURIComponent(user.surname)+"&firstname="+encodeURIComponent(user.firstname)+"&birthday="+encodeURIComponent(user.birthday)+"&street="+encodeURIComponent(user.street)+"&citycode="+encodeURIComponent(user.citycode)+"&city="+encodeURIComponent(user.city)+"&country="+encodeURIComponent(user.country)+"&mobile="+encodeURIComponent(user.mobile)+"&password="+encodeURIComponent(newPw)+"&repeat_password="+encodeURIComponent(repPw),
		success: function(data) {
			if(data.errors!=null && data.errors!="undefined"){
				$('#changePW_error_status')[0].innerHTML = data.errors[0];
				$.mobile.silentScroll(0);
			} else {
				$('#changePW_error_status')[0].innerHTML = '';
				$.mobile.silentScroll(0);
				$('#login_status').html("Successfully updated your data. You need to login again.");
				logout();
			}
		},
		error: function (request, status, error) {
			console.log("Could not renew password");
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// participate in this event
function participate(href, id){
	var myUrl = ROOT;
	if(href.indexOf("participate")>0){
		myUrl = myUrl + href;
	} else {
		myUrl = myUrl + "/_rest/event/participate/" + id;
	}
	$.ajax({
		url: myUrl,
		type: 'PUT',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(data) {
			display_event_detail("/_rest/events/"+id);
			//$('#event_detail_status').html('<b>Status:</b> You are confirmed as a friend. <a href=\"#myCode\" onclick=\"load_qrcode()\" data-role="button" data-theme="d" data-mini="true">Show QR Code</a><a href=\"#event\" onclick=\"stop_participating(\'' + href + '\', \'' +id+ '\')\" data-role="button" data-theme="e" data-mini="true">Remove event</a>');
			//$('#event_detail_status').trigger('create');
		},
		error: function (request, status, error) {
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// decline from this event. so we no longer wish to participate
function stop_participating(href, id){
	var myUrl = ROOT;
	if(href.indexOf("decline")>0){
		myUrl = myUrl + href;
	} else {
		myUrl = myUrl + "/_rest/event/decline/" + id;
	}
	$.ajax({
		url: myUrl,
		type: 'PUT',
		headers: {'Authorization': 'Basic ' + credentials},
		success: function(data) {
			$('#event_detail_status').html('<b>Status:</b> You are not participating. <a  onclick=\"participate(\'' + href + '\', \'' +id+ '\')\" data-role="button" data-theme="e" data-mini="true">Registrate on friendlist.</a>');
			$('#event_detail_status').trigger('create');
		},
		error: function (request, status, error) {
			console.log(request);
			alert(request.status + " " + request.statusText + ": " + request.responseText);
		}
	});
}

// show the dialog window that pops up, when the button on the top right is pressed
function show_OptionsFlyout() {
	$('#viOptionsFlyout0, #viOptionsFlyout1, #viOptionsFlyout2, #viOptionsFlyout3, #viOptionsFlyout4, #viOptionsFlyout5, #viOptionsFlyout6').each(function(ind,obj){obj.style.visibility = "visible";});
	$('#viOptionsButton0, #viOptionsButton1, #viOptionsButton2, #viOptionsButton3, #viOptionsButton4, #viOptionsButton5, #viOptionsButton6').attr("onClick","hide_OptionsFlyout()");
}

// hide the dialog window that pops up, when the button on the top right is pressed
function hide_OptionsFlyout() {
	$('#viOptionsFlyout0, #viOptionsFlyout1, #viOptionsFlyout2, #viOptionsFlyout3, #viOptionsFlyout4, #viOptionsFlyout5, #viOptionsFlyout6').each(function(ind,obj){obj.style.visibility = "hidden";});
	$('#viOptionsButton0, #viOptionsButton1, #viOptionsButton2, #viOptionsButton3, #viOptionsButton4, #viOptionsButton5, #viOptionsButton6').attr("onClick","show_OptionsFlyout()");
}

// used to set the area code when the country has changed
function changeTelPlaceholder(selectField){
	switch(selectField.selectedIndex)
	{
		case 0:
			$('#update_tel')[0].setAttribute('placeholder','+41');
			$('#tel')[0].setAttribute('placeholder','+41'); break;
		case 1:
			$('#update_tel')[0].setAttribute('placeholder','+423');
			$('#tel')[0].setAttribute('placeholder','+423'); break;
		case 2:
			$('#update_tel')[0].setAttribute('placeholder','+49');
			$('#tel')[0].setAttribute('placeholder','+49'); break;
		case 3:
			$('#update_tel')[0].setAttribute('placeholder','+43');
			$('#tel')[0].setAttribute('placeholder','+43'); break;
		case 4:
			$('#update_tel')[0].setAttribute('placeholder','+33');
			$('#tel')[0].setAttribute('placeholder','+33'); break;
		case 5:
			$('#update_tel')[0].setAttribute('placeholder','+39');
			$('#tel')[0].setAttribute('placeholder','+39'); break;
	}
}

// helper function to get the current date of the form yyyy-mm-dd
function getCurrentDate(){
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!

	var yyyy = today.getFullYear();
	if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} today = yyyy+'-'+mm+'-'+dd;
	return today;
}

function switchToJSDate(oldDate){
	var dd = oldDate.substring(0,2);
	var mm = oldDate.substring(3,5);
	var yy = oldDate.substring(6,11);
	return yy+"-"+mm+"-"+dd;
}

function switchToServerDate(oldDate){
	var dd = oldDate.substring(8,10);
	var mm = oldDate.substring(5,7);
	var yy = oldDate.substring(0,4);
	return dd+"-"+mm+"-"+yy;
}


// PHONEGAP FILE STORAGE HACKING START
function gotFS(fileSystem) {
	fileSystem.root.getFile("vizoom.txt", {create: true, exclusive: false}, gotFileEntry, fail);
}

function gotFileEntry(myFileEntry) {
	fileEntry = myFileEntry;
	loadFromFile();
}

function saveToFile() {
	if(fileEntry == undefined){
		console.log("fileEntry undefined");
	}
	else{
		fileEntry.createWriter(gotFileWriter, fail);
	}
}

function loadFromFile() {
	if(fileEntry == undefined){
		console.log("fileEntry undefined");
	}
	else{
		fileEntry.file(gotFile, fail);
	}
}

function gotFile(file) {
	var reader = new FileReader();
	reader.onloadend = function(evt) {
		console.log("read from file successfully");
		credentials = evt.target.result;
		$.mobile.changePage('#home', 'pop', true, true);
	};
	reader.readAsText(file);
}

function gotFileWriter(writer) {
	writer.onwriteend = function(evt) {
		console.log("saved to file successfully");
	};
	writer.write(credentials.toString());
}

function fail(error) {
	console.log(error.code);
}
// PHONEGAP FILE STORAGE HACKING END