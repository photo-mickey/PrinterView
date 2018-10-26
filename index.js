//********************************************************************************
const printerState = {
	free        : 1,
	printing    : 2,
	error       : 3
};
const plastic = {
	ABS	: 0x01,
	PLA	: 0x02,
	Watson	: 0x03,
	HIPS	: 0x04
};
const color = {
	white		: 0x01,
	black		: 0x02,
	lightGray	: 0x03,
	Gray		: 0x04,
	red		: 0x05,
	green		: 0x06,
	blue		: 0x07, 
	yellow		: 0x08,
	orange		: 0x09,
	brown		: 0x0A,
	purple		: 0x0B,
	emerald		: 0x0C,
	skiey		: 0x0D,
	coral		: 0x0E,
	rose		: 0x0F,
	chocolate	: 0x10,
	gold		: 0x11,
	krem		: 0x12,
	limeGreen	: 0x13,
	lightBlue	: 0x14,
	natural		: 0x15
};
//********************************************************************************
const tempDelta = 1;
//********************************************************************************
var refreshRate     = 3000; // in milliseconds
var numPrinters     = 0;
var modalIndex      = 0;
var printers        = new Object();
var connected       = true;
var client          = new Array();
var prevPanelWidth  = 0;
//********************************************************************************
var printersInfo = {
    tool:  [],
    state: []
}; 
//********************************************************************************

// ToDo:
// switch to sockJS 
// 	- Probably a dual system, with a fallback. You never know what those 
//    network security guys will block at work
// reorder printers
//	- low priotity, but it would be nice.
// checkbox for minimizing and not updating a printer
//	- Could be useful, but I think there may be other priorities
// Objectify. Too much running amok
// 
// Dreamlist:
// Webcams - DONE!
// Repetier-Server Integration
// Access Control/Database storage - 

window.onload = function () {
	// get saved printers
    	reloadPrinters();
        panelWidthControl();
  	// update printer info
  	setInterval(
            function () {
                updatePrinters();
            }, 
            refreshRate
        );
};

function initPrinters()
{
    printers ={
        "ip": [],
        "port": [],
        "apikey": [],
        "noConn": [],
        "camPort": []
    };
    printersInfo ={
        "tool":  [],
        "state": []
    };
}

function panelWidthControl(){
    var currentWidth = document.getElementById("panel"+1).offsetWidth;
    if (prevPanelWidth != currentWidth)
    {
        prevPanelWidth = currentWidth;
        for(var i = 0; i<numPrinters; i++){
            resizeCanvas(0.5625, i);
        }
    }
} 

function reloadPrinters() {
	if (localStorage.getItem("savedPrinters") === null) {
        initPrinters();
      	$("#noPrintersModal").modal("show");
  	} else {
      		delete client;
      		printers = JSON.parse(localStorage.getItem("savedPrinters"));
      		numPrinters = printers.ip.length;
      		for (var i = 0; i < numPrinters; i++) {
          		client.push(new OctoPrintClient());
          		client[i].options.baseurl = "http://" +printers.ip[i] + ":" +printers.port[i];
          		client[i].options.apikey = printers.apikey[i];
          		initialInfo(printers.ip[i], printers.port[i], printers.apikey[i], printers.camPort[i], i);
          		addPrinter(printers.ip[i], printers.port[i], printers.apikey[i], i);
                        resizeCanvas(0.5625, i);
       		}
   	}
}

function initialInfo(ip, port, apikey, camPort, index) {
	basicInfo(ip, port, apikey, index);
  	updateStatus(ip, port, apikey, camPort, index);
}

function updateStatus(ip, port, apikey, camPort, index) {
	client[index].get("api/connection")
  	.done(function (response) {
    		if (response.current.state === null) {
      			makeBlank(index);
    		} else {
        		// get printer state
        		document.getElementById("printerStatus" + index).innerHTML = "State: " + "<span class='highlight'>" + response.current.state + "</span>";
        		if (response.current.state !== ("Closed" || "Offline")) {
                                if (printersInfo.state[index] === printerState.free){
                                    document.getElementById("panel" + index).className = "panel panel-success";
                                } else {
                                    document.getElementById("panel" + index).className = "panel panel-primary";
                                }
        			basicInfo(ip, port, apikey, index);
          			jobInfo(ip, port, apikey, index);
          			tempInfo(ip, port, apikey, index);
                                videoInfo(printers.ip[index], printers.camPort[index], index);
        		} else if (response.current.state === ("Closed" || "Offline")) {
            			//Do not make blank. It is annoying.
          			document.getElementById("panel" + index).className = "panel panel-default";
          			basicInfo(ip, port, apikey, index);
      			}
    		}
  	})
  	.fail(function () {
     		makeBlank(index);
	});
}

function basicInfo(ip, port, apikey, index) {
  	client[index].get("/api/printerprofiles")
  	.done(function (response) {
      		// get name of the printer
    		document.getElementById("printerName" +index).innerHTML =response.profiles._default.name;
      		// set the panel footer as the printer's ip
    		document.getElementById("printerIP" +index).innerHTML = ip;
                // get number of tools
                printersInfo.tool[index] = response.profiles._default.extruder.count;
  	});
}

function jobInfo(ip, port, apikey, index) {
	// get info on current print job
  	client[index].get("/api/job")
  	.done(function (response) {
       		//get filename of print
      		if (response.job.file.name === null) {
          		// set current file to no file selected
          		document.getElementById("currentFile" +index).innerHTML ="No file selected";
          		// set time left field to no active print
          		document.getElementById("timeLeft" +index).innerHTML ="No active print";
                        printersInfo.state[index] = printerState.free;
          		// set print progress bar perecent to 0
          		$("div#progressBar" +index).css("width", "0%");
      		} else {
          		// set filename of current print
          		document.getElementById("currentFile" +index).innerHTML = "File: " + "<span class='highlight'>" +response.job.file.name.split(".").slice(0, -1).join(".") + "</span>" ;
          		// set estimation of print time left
          		document.getElementById("timeLeft" +index).innerHTML = "Time left: " + "<span class='highlight'>" + (response.progress.printTimeLeft / 60).toFixed(2) + "</span>" + " minutes";
                        if (response.progress.printTimeLeft === 0){
                            printersInfo.state[index] = printerState.free;
                        } else {
                            printersInfo.state[index] = printerState.printing;
                        }
          		// set percentage of print completion
          		$("div#progressBar" +index).css("width", response.progress.completion + "%");
    		}
	})
  	.fail(function () {
    		document.getElementById("panel" +index).className = "panel panel-danger";
    		makeBlank(index);
  	});
}

function tempInfo(ip, port, apikey, index) {
    strColor = 'color:red';
    // get info on temps
    client[index].get("/api/printer")
        .done(function (response) {
            // get temp of extruder 0 and its target temp
    
            if ((response.temperature.tool0.target === 0)&&(response.temperature.tool0.actual === 0)){
                strColor = 'color:green';    
            } else if (((response.temperature.tool0.actual + tempDelta) > response.temperature.tool0.target)&&((response.temperature.tool0.actual - tempDelta) < response.temperature.tool0.target)){
                strColor = 'color:green';
            } else {
                strColor = 'color:yellow';
            }
            document.getElementById("e0Temp" +index).innerHTML = "Extruder 0: " + "<span class='highlight'>" + response.temperature.tool0.actual + "°/" + response.temperature.tool0.target +"°" + "</span>";
            // get temp of extruder 1 and its target temp
            if (typeof response.temperature.tool1 !== "undefined" && response.temperature.tool1.actual !== null) {
                document.getElementById("e1Temp" +index).innerHTML = "Extruder 1: " + "<span class='highlight'>" + response.temperature.tool1.actual + "°/" + response.temperature.tool1.target +"°" + "</span>";
            } else {
                document.getElementById("e1Temp" +index).innerHTML ="Extruder 1: no tool";
            }
            // get temp of the bed and its target temp
            if (typeof response.temperature.bed !== "undefined" && response.temperature.bed.actual !== null) {
                document.getElementById("bedTemp" +index).innerHTML = "Bed: " + "<span class='highlight'>" + response.temperature.bed.actual + "°/" +response.temperature.bed.target +"°" + "</span>";
            } else {
                document.getElementById("bedTemp" +index).innerHTML ="0°";
            }
  	})
  	.fail(function () {
            document.getElementById("panel" +index).className = "panel panel-danger";
            makeBlank(index);
  	});
}


function scaleRect(srcSize, dstSize) {
      var ratio = Math.min(dstSize.width / srcSize.width,
                           dstSize.height / srcSize.height);
      var newRect = {
        x: 0, y: 0,
        width: srcSize.width * ratio,
        height: srcSize.height * ratio
      };
      newRect.x = (dstSize.width/2) - (newRect.width/2);
      newRect.y = (dstSize.height/2) - (newRect.height/2);
      return newRect;
    }

function resizeCanvas(ratio, index)
{
    var canvasWidth = (document.getElementById("panel"+index).offsetWidth)/1.2;
    var canvasHeight = canvasWidth * ratio;
    document.getElementById("printerCam"+index).width = canvasWidth;
    document.getElementById("printerCam"+index).height = canvasHeight;
}

function videoSizeUp(ip, camPort, index){
    
    $("#videoModalCenter").modal("show");
    document.getElementById("videoModalLongTitle").innerHTML = document.getElementById("printerName" + index).innerHTML;
    var canvas  = document.getElementById("modalCanvas");
    document.getElementById("modalCanvas").width  = 750;
    document.getElementById("modalCanvas").height = 570;
    var context = canvas.getContext("2d");
    
    var url = "http://" + ip + ":" + camPort + "/?action=stream";
    var img = new Image();
    img.src = url;
    
    img.onload = function() {
        var srcRect = {
            x: 0, 
            y: 0,
            width: img.naturalWidth,
            height: img.naturalHeight
        };
        var dstRect = scaleRect(
            srcRect, {
                width: canvas.width,
                height: canvas.height
            }
        );

        context.drawImage(
            img,
            srcRect.x,
            srcRect.y,
            srcRect.width,
            srcRect.height,
            dstRect.x,
            dstRect.y,
            dstRect.width,
            dstRect.height
        );
    };
}

function videoInfo(ip, camPort, index) {
    var url = "http://" + ip + ":" + camPort + "/?action=stream";
    var img = new Image();
    img.src = url;
    var canvas  = document.getElementById("printerCam" + index);
    var context = canvas.getContext("2d");
    
    
    canvas.onclick = function(){
        videoSizeUp(ip, camPort, index);
    };
    
    img.onload = function() {
        var srcRect = {
            x: 0, 
            y: 0,
            width: img.naturalWidth,
            height: img.naturalHeight
        };
        var dstRect = scaleRect(
            srcRect, {
                width: canvas.width,
                height: canvas.height
            }
        );
        context.drawImage(
            img,
            srcRect.x,
            srcRect.y,
            srcRect.width,
            srcRect.height,
            dstRect.x,
            dstRect.y,
            dstRect.width,
            dstRect.height
        );
    };
}

function updatePrinters() {
	for (var i = 0; i < numPrinters; i++) {
      		updateStatus(printers.ip[i], printers.port[i], printers.apikey[i], printers.camPort[i], i);
    	}
}

function eePrinter(ip, port, apikey, i, camPort, noConn) {
	if (i === numPrinters) {
        	// This is a new addition
        	addPrinter(ip, port, apikey, i);
        	numPrinters++;
        	if (noConn === null) {
            		makeBlank(i);
        	}
        	client.push(new OctoPrintClient());
    	}
    	// store ip and apikey info
    	printers.ip[i] = ip;
    	printers.port[i] = port;
    	printers.apikey[i] = apikey;
        printers.camPort[i] = camPort;
    	client[i].options.baseurl = "http://" + ip + ":" + port;
    	client[i].options.apikey = apikey;
    	// save new printer to local storage
    	localStorage.setItem("savedPrinters", JSON.stringify(printers));
    	// get initial info on printer
    	initialInfo(ip, port, apikey, camPort, i);
}


function addPrinter(ip, port, apikey, printerNum) {
  	var editButton          = '<li><button type="button" style="width: 100%" class="btn btn-default btn-sm pull-right" data-toggle="modal" onclick="eePrinterModal(' + printerNum +')">Edit Printer <span class="glyphicon glyphicon-edit" aria-hidden="true"></span></button></li>';
  	var removeButton        = '<li><button type="button" style="width: 100%" class="btn btn-default btn-sm pull-right" data-toggle="modal" onclick="removePrinter(' + printerNum +')">Remove Printer <span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button></li>';
  	var octoPrintPageButton = '<li><a type="button" style="width: 100%" class="btn btn-default btn-sm pull-right" data-toggle="modal" href="http://' +printers.ip[printerNum] +'/" target="_blank">OctoPrint <span class="glyphicon glyphicon-home" aria-hidden="true"></span></a></li>';
  	// add HTML
  	$("#printerGrid").append('<div class="col-xs-6 col-md-4" style="width: 230px" id="printer' + printerNum +'"></div>');
  	$("#printer" +printerNum).append('<div class="panel panel-primary"  id="panel' + printerNum +'"></div>');
  	$("#panel" +printerNum).append('<div class="panel-heading clearfix" id="panelHeading' + printerNum +'"></div>');
  	$("#panelHeading" +printerNum).append('<h4 class="panel-title pull-left" style="padding-top: 7.5px;" id="printerName' + printerNum +'">Printer</h4></h4>');
        $("#panelHeading" +printerNum).append('<a type="button" class="btn btn-default btn-sm pull-right" data-toggle="modal" href="http://' + printers.ip[printerNum] + '/" target="_blank"><span class="glyphicon glyphicon-home" aria-hidden="true"></span></a>');
  	$("#panelHeading" +printerNum).append('<div class="btn-group pull-right" id="btnGroup' + printerNum +'"></div>');
  	$("#btnGroup" +printerNum).append('<button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-expanded="false"><span class="glyphicon glyphicon-menu-hamburger" aria-hidden="true" id="menuBtn' + printerNum +'"></span></button>');
  	$("#btnGroup" +printerNum).append('<ul class="dropdown-menu" role="menu" id="dropdown' + printerNum +'"></ul>');
  	$("#dropdown" +printerNum).append(editButton);
  	$("#dropdown" +printerNum).append(removeButton);
  	$("#dropdown" +printerNum).append(octoPrintPageButton);
  	$("#panel" +printerNum).append('<div class="panel-body" id="body' + printerNum +'"></div>');
        $("#body" +printerNum).append('<canvas id="printerCam' + printerNum +'">Brouswe error!</canvas>');
	$("#body" +printerNum).append('<p id="printerStatus' + printerNum +'">status</p>');
 	$("#body" +printerNum).append('<p id="e0Temp' + printerNum +'">0</p>');
        $("#body" +printerNum).append('<p id="e1Temp' + printerNum +'">0</p>');
  	$("#body" +printerNum).append('<p id="bedTemp' + printerNum +'">0</p>');
  	$("#body" +printerNum).append('<p id="currentFile' + printerNum +'">No active print</p>');
  	$("#body" +printerNum).append('<p id="timeLeft' + printerNum +'">Print Time Left</p>');
  	$("#body" +printerNum).append('<div class="progress" id="progress' + printerNum +'"></div>');
  	$("#progress" +printerNum).append('<div class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"  id="progressBar' + printerNum +'"></div>');
	$("#panel" +printerNum).append('<div class="panel-footer" id="printerIP' + printerNum +'">ip</div>');
}

function eePrinterModal(index) {
	if (index === null) {
    		// Use blank/default values for new printer
    		index = numPrinters;
    		$("#eeIP").val("");
    		$("#eePort").val("80");
    		$("#eeApikey").val("");
                $("#eeCamPort").val("8080");
  	} else if (index === numPrinters) {
      		// Do nothing.
      		// Keep the current printer values
  	} else {
      		// Pull in existing printer values
    		printers = JSON.parse(localStorage.getItem("savedPrinters"));
    		$("#eeIP").val(printers.ip[index]);
    		$("#eePort").val(printers.port[index]);
    		$("#eeApikey").val(printers.apikey[index]);
                $("#eeCamPort").val(printers.camPort[index]);
  	}
  	modalIndex = index;
  	$("#eePrinterModal").modal("show");
}

function eeFromModal() {
  	var index = modalIndex;
  	var eeIP = $("#eeIP").val();
  	var eePort = $("#eePort").val();
  	var eeApikey = $("#eeApikey").val();
        var eeCamPort = $("#eeCamPort").val();
  	if (eeIP === "" || eeApikey === "" || eePort === "" || eeCamPort === "") {
    		$("#missingInfoModal").modal("show");
  	} else {
   		testConnection(eeIP, eePort, eeApikey, index, eeCamPort);
  	}
}

function deletePrinters() {
	// remove the printers from localStorage
    	localStorage.removeItem("savedPrinters");
    	// remove the printers from the printers object
    	initPrinters();
    	// reset the number of printers
    	delete client;
	numPrinters = 0;
    	// remove all elements within the grid
	$("#printerGrid").empty();
}

function removePrinter(index) {
	var printerNum = index +1;
    	bootbox.confirm("Remove printer #" +(printerNum) +"?", function (result) {
  		if (result) {
  			// remove the printer from the page
			document.getElementById("printer" +index).remove();
  	    		// remove the printer from the printers object
			printers.ip.splice(index, 1);
        		printers.port.splice(index, 1);
        		printers.apikey.splice(index, 1);
                        printers.camPort.splice(index, 1);
  	    		// save new object to localStorage
			if (numPrinters <= 1) {
				localStorage.removeItem("savedPrinters");
			} else {
				localStorage.setItem("savedPrinters", JSON.stringify(printers));
  	    		}
			numPrinters = 0;
        		delete client;
			$("#printerGrid").empty();
			reloadPrinters();
    		}
  	});
}

function makeBlank(index) {
    	// make panel border color red
    	document.getElementById("panel" + index).className = "panel panel-danger";
        printersInfo.state[index] = printerState.error;
    	// make the status fields blank
    	document.getElementById("printerStatus" +index).innerHTML ="";
    	document.getElementById("e0Temp" +index).innerHTML ="";
    	document.getElementById("bedTemp" +index).innerHTML ="";
    	document.getElementById("currentFile" +index).innerHTML ="";
    	document.getElementById("timeLeft" +index).innerHTML ="";
    	// set progress bar to 0%
    	$("div#progressBar" +index).css("width", "0%");
    	// set panel footer to printer ip with not connected messgae
    	document.getElementById("printerIP" +index).innerHTML = printers.ip[index] +" (not connected)";
}

function testConnection(ip, port, apikey, index, camPort) {
    	var testClient = new OctoPrintClient();
    	testClient.options.baseurl = "http://" + ip + ":" + port;
    	testClient.options.apikey = apikey;
    	testClient.get("/api/connection")
   	.done(function (response) {
       		if (response.current.state !== null) {
        		eePrinter(ip, port, apikey, index, camPort);
  		} else {
        		connectionError(ip, port, apikey, index, camPort);
  		}
   	})
   	.progress(function() {
       		console.log("H");
    	})
    	.fail(function () {
        	connectionError(ip, port, apikey, index, camPort);
    	});
}

function connectionError(ip, port, apikey, index,camPort) {
	var errorMessage = "PrinterView was unable to connect to the OctoPrint instance at <b>" + ip + "</b> using the following API key: " + apikey +". Do you still want to add this printer?";
  	bootbox.confirm(errorMessage, function (result) {
      		if (result) {
        		eePrinter(ip, port, apikey, index, camPort, "No Connection");
      		} else {
        		return 0;
      		}
  	});
}
