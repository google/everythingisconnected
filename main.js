/**	Copyright 2016 Google Inc.
/*
/*	Licensed under the Apache License, Version 2.0 (the "License");
/*	you may not use this file except in compliance with the License.
/*	You may obtain a copy of the License at
/*
/*	    http://www.apache.org/licenses/LICENSE-2.0
/*
/*	Unless required by applicable law or agreed to in writing, software
/*	distributed under the License is distributed on an "AS IS" BASIS,
/*	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/*	See the License for the specific language governing permissions and
/*	limitations under the License.
 */
(function ($) {$(function() {
/** TODOs
/ * link or display Wikipedia article
/ * editor for new puzzles
/ * todos in code
  */

evil = {}; // just a global for debugging reasons, should not be used in code

var log = function(l) {
	console.log(l);
};
var fieldSize = 100;
var topSpace = 5;
var leftSpace = 5;
var wiggleSpace = 20;
var finished = false;

var shuffle = function(array) {
  // Knuth shuffle algorithm
  var i = array.length, t, r;
  while (0 !== i) {
    r = Math.floor(Math.random() * i);
    i -= 1;
    t = array[i];
    array[i] = array[r];
    array[r] = t;
  }
  return array;
};
var createBoard = function(lang, board) {
	$.each(board.field, function(lineindex, line) {
		$.each(line, function(rowindex, field) {
			var tileclass = "field";
			var qid = "";
			if (!board.field[lineindex][rowindex].exists) { return; }
			if (board.field[lineindex][rowindex].fixed) {
				qid = board.field[lineindex][rowindex].current;
				tileclass += " fixed";
			}
			var pos = 'l' + lineindex + 'r' + rowindex;
			$("#board").append(
				'<div class="' + tileclass + ' tile ui-widget-content" id="' + pos + '"><span>' + qid + '</span></div>'
			);
			$('#' + pos).css({top: lineindex*fieldSize+topSpace, left: rowindex*fieldSize+leftSpace});
		});
	});
	$("#board").width(board.maxWidth*fieldSize + 5);
	$("#board").height(board.maxHeight*fieldSize + 5);
	
	shuffle(board.deck);
	var leftshift = 0;
	var topshift = 0;
	if (($(window).width()-board.maxWidth*fieldSize)>($(window).height()-board.maxHeight*fieldSize)) {
		leftshift = board.maxWidth;
	} else {
		topshift = board.maxHeight;
	}
	$.each(board.deck, function(index, qid) {
		$("#board").append('<div id="' + qid + '" class="ui-widget-content tile side"><span>' + qid + '</span></div>');
		$('#' + qid).css({
			left: (index % board.maxWidth+leftshift)*fieldSize+leftSpace+wiggleSpace + Math.floor(Math.random()*wiggleSpace),
			top: (Math.floor(index/board.maxWidth)+topshift)*fieldSize+topSpace+wiggleSpace + Math.floor(Math.random()*wiggleSpace)
		});
	});
	var kb = {};
	
	$( ".side" ).draggable({
		start: function(event, ui) {
			if (!finished) return;
			var qid = $(this).attr('id');
			if (board.pieces[qid]!=null) {
				var y = board.pieces[qid][0];
				var x = board.pieces[qid][1];
				board.field[y][x].current = null;
				board.pieces[qid] = null;
			}
			checkBoard(board, lang, kb);
		}
	});
	$( ".field" ).droppable({
		accept: ".side",
		drop: function(event, ui) {
			if (!finished) return;
			var pos = $(this).attr('id').substring(1).split('r');
			var y = parseInt(pos[0]);
			var x = parseInt(pos[1]);
			if (board.field[y][x].current==null) {
		        $(ui.draggable).css($(this).position());
				var qid = ui.draggable.attr('id');
				board.field[y][x].current = ui.draggable.attr('id');
				board.pieces[qid] = [y, x];
			}
			checkBoard(board, lang, kb);
		}
	});
	loadBoardEntities(kb, lang, board);
};
var urlParam = function(name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null) {
       return null;
    } else {
       return results[1] || 0;
    }
};
var initLanguage = function() {
	var lang = urlParam('lang');
	if (lang==null) {
		lang = 'en';
	}
	return lang;
};
var validateBoard = function(param) {
	return /^(Q[0-9]*\+?\/?)*$/.test(param);
};
var initBoard = function() {
	var boardParam = urlParam('board');
	if (boardParam!=null && !validateBoard(boardParam)) {
		log("Using default board as parameter board is invalid: " + boardParam);
		boardParam = null;
	}
	if (boardParam==null) {
		// default starting board
		boardParam = 'Q7186+Q1622272Q60025/Q5Q9438Q868/Q1067Q40185Q8409+';
	}
	var board = {};
	board.initstring = boardParam;
	var lines = board.initstring.split('/');
	board.deck = [];
	board.pieces = {};
	board.field = $.map(lines, function(line) {
		return [$.map(line.substring(1).split('Q'), function(value) {
			var field = {};
			field.exists = (value!='0');
			if (!field.exists) {
				field.solution = null;
				field.current = null;
				field.fixed = null;
				return field;			
			}
			field.fixed = (value.slice(-1)=='+');
			if (field.fixed) {
				field.solution = 'Q' + value.slice(0, -1);
				field.current = field.solution;
			} else {
				field.solution = 'Q' + value;
				field.current = null;
				board.deck.push(field.solution);
				board.pieces[field.solution] = null;
			}
			return field;
		})];
	});
	board.maxHeight = lines.length;
	board.maxWidth = Math.max.apply(null, $.map(board.field, function(line) { return line.length; }));
	for (y = 0; y < board.maxHeight; y++)
		for (x = 0; x < board.maxWidth; x++) {
			if (x>=board.field[y].length) {
				 board.field[y][x] = { exists: false, solution: null, current: null, fixed: null }
			}
			if (board.field[y][x].current!=null)
				board.pieces[board.field[y][x].current] = [y, x];
		}
	return board;
};
var showConnection = function(y1, x1, y2, x2, p, kb, language) {
	if (y1==y2) {
		var y = topSpace+(y1+0.5)*fieldSize-15;
		var x = leftSpace+(x1+1)*fieldSize-15;
	}
	if (x1==x2) {
		var y = topSpace+(y1+1)*fieldSize-15;
		var x = leftSpace+(x1+0.5)*fieldSize-15;
	}
	var elem = $('<div class="connection nofit">?</div>');
	if (p!=false) {
		var proplabel = getLabel(kb[p], language);
		elem = $('<div class="connection fit">&nbsp;<span class="popup">' + proplabel + '</span></div>');
		// the following is to fixup popups on mobile
		elem.attr("data-hide", false);
		elem.click(function () {
	        var $popup = $(this).find(".popup");
	        if ($popup.attr("data-hide") === "false") {
	            $popup.show();
	        }
	        $popup.attr("data-hide", false);
	    });
	    elem.click(function () { $(this).attr("data-hide",true); });
	    $(document).mouseup(function () { $(".popup").hide(); });
	    elem.mouseenter(function () { $(this).find(".popup").show(); });
	    elem.mouseleave(function () { $(this).find(".popup").hide(); }); 
	}
	elem.css({top: y, left: x});
	$("#board").append(elem);
};
var clearConnections = function() {
	$(".connection").remove();
};
var loadEntities = function(toLoad, entities, callbackFunction, argumentsToCallback) {
	var loadNow = toLoad.slice(0, 48);
	var loadLater = toLoad.slice(48);
	$.ajax({
		dataType: "jsonp",
		url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=' + toLoad.join('|')
	}).done(function ( response ) {
		$.each(response.entities, function(index, entity) {
			entities[index] = entity;
		});
		if (loadLater.length > 0) {
			loadEntities(loadLater, entities, callbackFunction, argumentsToCallback);
		} else {
			callbackFunction(entities, argumentsToCallback);
		}
	});
};
var idle = function() {
	finished=true;
};
var loadProperties = function(entities, args) {
	paintTiles(args.board, args.language, args.kb);
	solvableBoard(args.board, args.kb)
	var properties = [];
	$.each(args.kb, function(index, item) {
		$.each(item.claims, function(prop, values) {
			if ($.inArray(prop, properties)==-1) {
				properties.push(prop);
			}
		});
	});
	loadEntities(properties, args.kb, idle, {});
};
var loadBoardEntities = function(kb, language, board) {
	boardEntities = [];
	for (y=0;y<board.field.length;y++)
		for (x=0;x<board.field[y].length;x++)
			if (board.field[y][x].exists)
				boardEntities.push(board.field[y][x].solution);
	loadEntities(boardEntities, kb, loadProperties, {board: board, language: language, kb: kb});
};
var getLabel = function(item, language) {
	if((typeof(item['labels']) == 'undefined')||(typeof(item.labels[language]) == 'undefined')) {
		if (language=="en") {
			return item.id;
		} else {
			return getLabel(item, "en");
		}
	}
	return item.labels[language].value;
};
var setImage = function(item, tile) {
	var filename = null;
	if(typeof(item.claims.P18) != 'undefined') {
		filename = item.claims.P18[0].mainsnak.datavalue.value;
	}
	if (filename == null) {
		$.each(item.claims, function(p, claims) {
			$.each(claims, function(index, claim) {
				if (filename != null) return;
				if (claim.mainsnak.datatype=="commonsMedia") {
					filename = claim.mainsnak.datavalue.value;
				}
			});
		});
	}
	if (filename == null) {
		return;
	}
	$('#imageSourcesList').append('<p><a href="https://commons.wikimedia.org/wiki/File:' + filename + '">' + filename + '</a></p>')
	$.getJSON('https://commons.wikimedia.org/w/api.php?callback=?', {
		action: 'query' ,
		formatversion: 2,
		prop: 'imageinfo',
		iiprop: 'url' ,
		iilimit: 1,
		iiurlwidth: 80,
		titles: 'File:' + filename,
		format: 'json'
	}, function(commonsresponse) {
		var url = commonsresponse.query.pages[0].imageinfo[0].thumburl;
		$(tile).css('background-image', 'url(' + url + ')');
	});
};
var paintTiles = function(board, language, kb) {
	for (y=0;y<board.field.length;y++)
		for (x=0;x<board.field[y].length;x++)
			if (board.field[y][x].exists) {
				var f = board.field[y][x];
				var l = getLabel(kb[f.solution], language);
				var tile = ''; 
				if (f.fixed) {
					tile = '#l' + y + 'r' + x;
				} else {
					tile = '#' + f.solution;
				}
				$(tile + ' span').text(l);
				setImage(kb[f.solution], tile);
			}
	// TODO add descriptions?
};
var hasClaimObject = function(s, o, kb) {
	var connection = false;
	$.each(kb[s].claims, function(p, v) {
		$.each(v, function(i, v) {
			if (connection!=false) return;
			if (v.mainsnak.datatype=="wikibase-item")
				if (v.mainsnak.snaktype=="value")
					if (v.mainsnak.datavalue.value.id == o)
						connection = p;
		});
	});
	return connection;
};
var fits = function(q1, q2, kb) {
	return hasClaimObject(q1, q2, kb) || hasClaimObject(q2, q1, kb);
};
var checkBoard = function(board, language, kb) {
	clearConnections();
	var allSet = true;
	var allFit = true;
	for (y=0;y<board.field.length;y++)
		for (x=0;x<board.field[y].length;x++)
			if (board.field[y][x].exists) {
				var f1 = board.field[y][x].current;
				if (f1==null) {
					allSet = false;
				} else {
					if (x+1<board.field[y].length)
						if (board.field[y][x+1].exists) {
							var f2 = board.field[y][x+1].current;
							if (f2!=null) {
								var p = fits(f1, f2, kb);
								showConnection(y, x, y, x+1, p, kb, language);
								if (p==false) {
									allFit = false;
								}
							}
						}
					if (y+1<board.field.length)
						if (board.field[y+1][x].exists) {
							var f2 = board.field[y+1][x].current;
							if (f2!=null) {
								var p = fits(f1, f2, kb);
								showConnection(y, x, y+1, x, p, kb, language);
								if (p==false) {
									allFit = false;
								}
							}
						}
				}
			}
	if (allSet && allFit) {
		$('h1').text('Congratulations!').after('<p style="margin-top:-1em;">[<a href="https://www.wikidata.org/wiki/User:Denny/Everything_is_connected">List of levels</a>]</p>');
	}
};
var solvableBoard = function(board, kb) {
	var allFit = true;
	for (y=0;y<board.field.length;y++)
		for (x=0;x<board.field[y].length;x++)
			if (board.field[y][x].exists) {
				var f1 = board.field[y][x].solution;
				if (x+1<board.field[y].length)
					if (board.field[y][x+1].exists) {
						var f2 = board.field[y][x+1].solution;
						if (!fits(f1, f2, kb)) allFit = false;
					}
				if (y+1<board.field.length)
					if (board.field[y+1][x].exists) {
						var f2 = board.field[y+1][x].solution;
						if (!fits(f1, f2, kb)) allFit = false;
					}
			}
	if (!allFit) {
		$('body').css('background-color', '#fdd');
		$('h1').after('<p style="margin-top:-1em;">Warning! This level might be unsolvable <a href="about.html#unsolvable">[see more]</a></p>');
	}
};
createBoard(initLanguage(), initBoard());

$('#imageSources').click(function() { $('#imageSourcesList').toggle() });
});}(jQuery));
