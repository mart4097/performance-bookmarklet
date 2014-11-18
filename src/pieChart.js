/*
Logic for Request analysis pie charts
*/


(function(){
	function createPieChart(data, size){
		//inpired by http://jsfiddle.net/da5LN/62/

		var chart = newElementNs("svg:svg", {
			width : "100%",
			viewBox : "0 0 " + size + " " + size
		}, "float: left; max-height:"+((window.innerWidth * 0.98 - 64) / 3)+"px;");

		var unit = (Math.PI * 2) / 100,
			startAngle = 0; // init startAngle


		var createWedge = function(id, size, percentage, labelTxt, colour){
			var radius = size/2,
				endAngle = startAngle + (percentage * unit - 0.001),
				labelAngle = startAngle + (percentage/2 * unit - 0.001),
				x1 = radius + radius * Math.sin(startAngle),
				y1 = radius - radius * Math.cos(startAngle),
				x2 = radius + radius * Math.sin(endAngle),
				y2 = radius - radius * Math.cos(endAngle),
				x3 = radius + radius * 0.85 * Math.sin(labelAngle),
				y3 = radius - radius * 0.85 * Math.cos(labelAngle),
				big = (endAngle - startAngle > Math.PI) ? 1 : 0;

			var d = "M " + radius + "," + radius +	// Start at circle center
					" L " + x1 + "," + y1 +				// Draw line to (x1,y1)
					" A " + radius + "," + radius +	// Draw an arc of radius r
					" 0 " + big + " 1 " +				// Arc details...
					x2 + "," + y2 +						// Arc goes to to (x2,y2)
					" Z";								// Close path back to (cx,cy)

			var path = newElementNs("path", {
				id : id,
				d : d,
				fill : colour
			});

			path.appendChild(newElementNs("title", {
				text : labelTxt
			})); // Add tile to wedge path
			path.addEventListener("mouseover", function(evt){
				evt.target.style.opacity = "0.5";
				outputIFrame.getElementById(evt.target.getAttribute("id") + "-table").style.backgroundColor = "#ccc";
			});
			path.addEventListener("mouseout", function(evt){
				evt.target.style.opacity = "1";
				outputIFrame.getElementById(evt.target.getAttribute("id") + "-table").style.backgroundColor = "transparent";
			});

			startAngle = endAngle;
			if(percentage > 10){
				var wedgeLabel = newTextElementNs(labelTxt, y3);

				//first half or second half
				if(labelAngle < Math.PI){
					wedgeLabel.setAttribute("x", x3 - getNodeTextWidth(wedgeLabel));
				}else{
					wedgeLabel.setAttribute("x", x3);
				}

				return { path: path, wedgeLabel: wedgeLabel};
			}			
			return { path: path };
		};
		
		//setup chart
		var labelWrap = newElementNs("g", {}, "pointer-events:none; font-weight:bold;");
		var wedgeWrap = newElementNs("g");

		//loop through data and create wedges
		data.forEach(function(dataObj){
			var wedgeAndLabel = createWedge(dataObj.id, size, dataObj.perc, dataObj.label + " (" + dataObj.count + ")", dataObj.colour || getRandomColor());
			wedgeWrap.appendChild(wedgeAndLabel.path);

			if(wedgeAndLabel.wedgeLabel){
				labelWrap.appendChild(wedgeAndLabel.wedgeLabel);
			}
		});

		// foreground circle
		wedgeWrap.appendChild(newElementNs("circle", {
			cx : size/2,
			cy : size/2,
			r : size*0.05,
			fill : "#fff"
		}));
		chart.appendChild(wedgeWrap);
		chart.appendChild(labelWrap);
		return chart;
	};

	var createTable = function(title, data){
		//create table
		var tableHolder = newTag("div", {}, "float:left; width:100%; overflow-x:auto");
		var table = newTag("table", {}, "float:left; width:100%; font-size:12px; line-height:18px;");
		var thead = newTag("thead");
		var tbody = newTag("tbody");
		thead.appendChild(newTag("th", {text : title}, "text-align: left; padding:0 0.5em 0 0;"));
		thead.appendChild(newTag("th", {text : "Requests"}, "text-align: left; padding:0 0.5em 0 0;"));
		thead.appendChild(newTag("th", {text : "Percentage"}, "text-align: left; padding:0 0.5em 0 0;"));
		table.appendChild(thead);

		data.forEach(function(y){
			var row = newTag("tr", {id : y.id + "-table"});
			row.appendChild(newTag("td", {text : y.label}));
			row.appendChild(newTag("td", {text : y.count}));
			row.appendChild(newTag("td", {text : y.perc.toPrecision(2) + "%"}));
			tbody.appendChild(row);
		});

		table.appendChild(tbody);
		tableHolder.appendChild(table);

		return tableHolder;
	};

	//filter out non-http[s] and sourcemaps
	var requestsOnly = allRessourcesCalc.filter(function(currR) {
		return currR.name.indexOf("http") === 0 && !currR.name.match(/js.map$/);
	});

	//get counts
	var fileExtensionCounts = getItemCount(requestsOnly.map(function(currR, i, arr){
		return currR.initiatorType || currR.fileExtension;
	}), "fileType");

	var fileExtensionCountLocalExt = getItemCount(requestsOnly.map(function(currR, i, arr){
		return (currR.initiatorType  || currR.fileExtension) + " " + (currR.isLocalDomain ? "(local)" : "(extenal)");
	}), "fileType");

	var requestsByDomain = getItemCount(requestsOnly.map(function(currR, i, arr){
		return currR.domain;
	}), "domain");



	// create a chart and table section
	var setupChart = function(title, data, countTexts){
		var chartHolder = newTag("div", {}, "float:left; width:28%; margin: 0 5.3333% 0 0;");
		chartHolder.appendChild(newTag("h1", {text : title}, "font:bold 16px/18px sans-serif; margin:1em 0; color:#666; min-height:2em;"));
		chartHolder.appendChild(createPieChart(data, 400));
		chartHolder.appendChild(newTag("p", {text : "Total Requests: " + requestsOnly.length}));
		if(countTexts && countTexts.length){
			countTexts.forEach(function(countText){
				chartHolder.appendChild(newTag("p", {text : countText}, "margin-top:-1em"));
			})
		}
		chartHolder.appendChild(createTable(title, data));
		outputContent.appendChild(chartHolder);
	};


	// init data for charts

	var requestsUnit = requestsOnly.length / 100;
	var colourRangeR = "789abcdef";
	var colourRangeG = "789abcdef";
	var colourRangeB = "789abcdef";
	var currAndSubdomainRequests = requestsOnly.filter(function(domain){
		return domain.domain.split(".").slice(-2).join(".") === location.host.split(".").slice(-2).join(".");
	}).length;

	var crossDocDomainRequests = requestsOnly.filter(function(domain){
		return !endsWith(domain.domain, document.domain);
	}).length;

	var hostRequests = requestsOnly.filter(function(domain){
		return domain.domain === location.host;
	}).length;

	var hostSubdomains = requestsByDomain.filter(function(domain){
		return endsWith(domain.domain, location.host.split(".").slice(-2).join(".")) && domain.domain !== location.host;
	}).length;

	var requestsByDomainData = requestsByDomain.map(function(domain){
		domain.perc = domain.count / requestsUnit;
		domain.label = domain.domain;
		if(domain.domain === location.host){
			domain.colour = "#0c0";
		}else if(domain.domain.split(".").slice(-2).join(".") === location.host.split(".").slice(-2).join(".")){
			domain.colour = "#0a0";
		}else{
			domain.colour = getRandomColor("56789abcdef", "01234567", "abcdef");
		}
		domain.id = "reqByDomain-" + domain.label.replace(/[^a-zA-Z]/g, "-");
		return domain;
	});


	setupChart("Requests by Domain", requestsByDomainData, [
		"Domains Total: " + requestsByDomain.length,
		"Subdomains of TLD: " + hostSubdomains,
		"Current TLD & Subdomain Requests: " + currAndSubdomainRequests,
		"Requests to Host: " + hostRequests,
		"CrossDomain Requests (document.domain): " + crossDocDomainRequests,
		"-----------------------",
		"TLD = Top Level Domain"
	]);

	setupChart("Requests by Initiator Type (local/external domain)", fileExtensionCountLocalExt.map(function(fileType){
		fileType.perc = fileType.count / requestsUnit;
		fileType.label = fileType.fileType;
		fileType.colour = getInitiatorTypeColour((fileType.fileType.split(" ")[0]), getRandomColor(colourRangeR, colourRangeG, colourRangeB));
		fileType.id = "reqByTypeLocEx-" + fileType.label.replace(/[^a-zA-Z]/g, "-");
		return fileType;
	}));

	setupChart("Requests by Initiator Type", fileExtensionCounts.map(function(fileType){
		fileType.perc = fileType.count / requestsUnit;
		fileType.label = fileType.fileType;
		fileType.colour = getInitiatorTypeColour((fileType.fileType), getRandomColor(colourRangeR, colourRangeG, colourRangeB));
		fileType.id = "reqByType-" + fileType.label.replace(/[^a-zA-Z]/g, "-");
		return fileType;
	}));

	tablesToLog = tablesToLog.concat([
		{name : "Requests by domain", data : requestsByDomain},
		{name : "File type count (local / external)", data : fileExtensionCounts, columns : ["fileType", "count", "perc"]},
		{name : "File type count", data : fileExtensionCountLocalExt, columns : ["fileType", "count", "perc"]}
	]);
}());