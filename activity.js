/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0

 Scaling requirements:
 * We want to be able to support full screen.
 * We don't want to use a specific size like 800x600, because then even the
   fonts are scaled!
 * We want to rely on a 16:9 aspect ratio.
 So, result:
 * We resize the canvas on window.resize to fit the window while keeping 16:9.
 * We resize/reposition everything manually.
*/
// TODO: create a game global object to avoid polluting the namespace?
var stage;
var bg;
// Region = {
//   cont: Container, box: Shape, tiles: [Bitmap], color: String, selectedTile,
//   gx: GridX, gy: GridY, ts: TileSize, bs: BlankSpace, ma: Margin, x, y }
var r1 = { tiles: Array(8), color: "#f0c0c0" };
var r2 = { tiles: Array(8), color: "#c0f0c0" };
var r3 = { tiles: Array(10), color: "#c0c0f0" };
// the menu bar buttons
var r4 = { tiles: Array(5) };
var statusText, lvlText;
var imgSuccess;
const ratio = 16/9;
// To use .svg images, they must not have width or height="100%":
// https://bugzilla.mozilla.org/show_bug.cgi?id=874811
// Additionally, preloadjs currently doesn't work with .svg images.
// Put the tiles first so that we can get them by index more easily
var resourceNames = ['l_blank.svg', 'l_placeholder.svg', 'l0.svg', 'l1.svg', 'l2.svg', 'l3.svg', 'l4.svg', 'l5.svg', 'l6.svg', 'l7.svg', 'l8.svg', 'l9.svg', 'l10.svg', 'l11.svg', 'l12.svg', 'l13.svg', 'l14.svg', 'l15.svg', 'l16.svg', 'l17.svg', 'l18.svg', 'l19.svg', 'l20.svg', 'l21.svg', 'l22.svg', 'l23.svg', 'p_blank.png',  'p0.png', 'p1.png', 'p2.png', 'p3.png', 'p4.png', 'p5.png', 'p6.png', 'p7.png', 'p8.png', 'p9.png', 'p10.png', 'p11.png', 'p12.png', 'p13.png', 'p14.png', 'p15.png', 'p16.png', 'p17.png', 'p18.png', 'p19.png', 'p20.png', 'p21.png', 'p22.png', 'p23.png', 'bar_home.svg', 'bar_help.svg', 'bar_about.svg', 'bar_previous.svg', 'bar_next.svg', 'background.svg', 'flower_good.svg', 'lion_good.svg'];
var resources = [];
var resourcesLoaded = 0;
var level;
var endGame = false;
var alphabet = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';

function init() {
  console.clear();
  stage = new createjs.Stage("mainCanvas");
  stage.enableMouseOver();
  stage.snapToPixelEnabled = true;
  createjs.Bitmap.prototype.snapToPixel = true;
  statusText = new createjs.Text("Φόρτωση...", "20px Arial", "white");
  statusText.textAlign = "center";
  statusText.textBaseline = "middle";
  stage.addChild(statusText);
  resize();

  // Resource preloading
  for (var i = 0; i < resourceNames.length; i++) {
    resources[i] = new Image();
    resources[i].src = "resource/" + resourceNames[i];
    resources[i].rname = resourceNames[i];
    resources[i].onload = queueFileLoad;
  }
  // The last queueFileLoad calls queueComplete. Execution continues there.
}

function queueFileLoad(event) {
  resourcesLoaded++;
  statusText.text = "Φόρτωση " + parseInt(100*resourcesLoaded/resourceNames.length) + " %";
  stage.update();
  if (resourcesLoaded == resourceNames.length)
    queueComplete(event);
}

// Return an integer from 0 to num-1.
function random(num) {
  return Math.floor(Math.random() * num);
}

function imgByName(name) {
  var i = resourceNames.indexOf(name);
  if (i < 0)
    console.log(`imgByName failed for name=${name}`);

  return resources[i];
}

function queueComplete(event) {
  console.log("Finished loading resources");
  // We only keep statusText for debugging; not visible in production builds
  statusText.visible = false;
  bg = new createjs.Bitmap(imgByName("background.svg"));
  stage.addChild(bg);

  r1.box = new createjs.Shape();
  stage.addChild(r1.box);
  r1.cont = new createjs.Container();
  stage.addChild(r1.cont);
  // We always initialize the max number of tiles, and reuse them
  for (i = 0; i < r1.tiles.length; i++) {
    r1.tiles[i] = new createjs.Bitmap(imgByName("p_blank.png"));
    r1.tiles[i].i = i;
    r1.cont.addChild(r1.tiles[i]);
  }
  r1.selectedTile = null;

  r2.box = new createjs.Shape();
  stage.addChild(r2.box);
  r2.cont = new createjs.Container();
  stage.addChild(r2.cont);
  for (i = 0; i < r2.tiles.length; i++) {
    r2.tiles[i] = new createjs.Bitmap(imgByName("l_blank.svg"));
    r2.tiles[i].i = i;
    r2.cont.addChild(r2.tiles[i]);
  }

  r3.box = new createjs.Shape();
  stage.addChild(r3.box);
  r3.cont = new createjs.Container();
  stage.addChild(r3.cont);
  for (i = 0; i < r3.tiles.length; i++) {
    r3.tiles[i] = new createjs.Bitmap(imgByName("l_blank.svg"));
    r3.tiles[i].addEventListener("pressmove", onR3pressmove);
    r3.tiles[i].addEventListener("pressup", onR3pressup);
    r3.tiles[i].i = i;
    r3.cont.addChild(r3.tiles[i]);
  }

  var onMenuClick = [onMenuHome, onMenuHelp, onMenuAbout, onMenuPrevious, onMenuNext];
  r4.cont = new createjs.Container();
  stage.addChild(r4.cont);
  for (i = 0; i < r4.tiles.length; i++) {
    r4.tiles[i] = new createjs.Bitmap(resources[resourceNames.indexOf("bar_home.svg") + i]);
    r4.tiles[i].addEventListener("click", onMenuClick[i]);
    r4.tiles[i].addEventListener("mouseover", onR4mouseover);
    r4.tiles[i].addEventListener("mouseout", onR4mouseout);
    r4.tiles[i].i = i;
    r4.cont.addChild(r4.tiles[i]);
  }

  lvlText = new createjs.Text("1", "20px Arial", "white");
  lvlText.textAlign = "center";
  lvlText.textBaseline = "middle";
  stage.addChild(lvlText);

  imgSuccess = new createjs.Bitmap(imgByName("p_blank.png"));
  imgSuccess.visible = false;
  stage.addChild(imgSuccess);

  // Bring statusText in front of everything
  statusText.textAlign = "right";
  statusText.textBaseline = "alphabetic";
  stage.setChildIndex(statusText, stage.numChildren - 1);

  initLevel(0);
  window.addEventListener('resize', resize, false);
  createjs.Ticker.on("tick", tick);
  // createjs.Ticker.timingMode = createjs.Ticker.RAF;
  // createjs.Ticker.framerate = 10;
}

function onR3pressmove(event) {
  var pt = event.target.parent.globalToLocal(event.stageX, event.stageY);
  event.target.x = pt.x;
  event.target.y = pt.y;
  stage.update();
}

function onR3pressup(event) {
  // When we drop an image over a target place, we don't want to check for
  // "mouseover" because the place image might be thin and have a lot of
  // transparency. So we want to test for a "square" mouseover.
  var pt = r2.box.globalToLocal(event.stageX, event.stageY);
  for (i = 0; i < r2.tilesNum; i++)
    if ((Math.abs(pt.x - r2.tiles[i].x) <= r2.ts/2)
      && (Math.abs(pt.y - r2.tiles[i].y) <= r2.ts/2)) {
    r2.tiles[i].image = event.target.image;
    r2.tiles[i].updateCache();
    checkEndGame();
  }
  event.target.x = event.target.savedX;
  event.target.y = event.target.savedY;
  stage.update();
}

function onR4mouseover(event) {
  event.target.scaleX = 1.2*event.target.savedscaleX;
  event.target.scaleY = 1.2*event.target.savedscaleY;
  stage.update();
}

function onR4mouseout(event) {
  event.target.scaleX = event.target.savedscaleX;
  event.target.scaleY = event.target.savedscaleY;
  stage.update();
}

function onMenuHome(event) {
  window.history.back();
}

function onMenuHelp(event) {
  alert("Από το κάτω κουτί, επιλέξτε τα γράμματα που αντιστοιχούν στα αρχικά γράμματα των εικόνων του πάνω κουτιού, και τοποθετήστε τις στο μεσαίο κουτί.");
}

function onMenuAbout(event) {
  window.open("credits/index_DS_II.html");
}

function onMenuPrevious(event) {
  initLevel(level - 1);
}

function onMenuNext(event) {
  initLevel(level + 1);
}

// tilesArray, tileWidth, boxWidth
function alignTiles(tilesA, tileW, boxW) {
  // We do want at least one pixel spacing between the tiles
  tilesPerRow = Math.floor(boxW/(tileW+1))
  // If all tiles fit, use that number
  tilesPerRow = Math.min(tilesA.length, tilesPerRow)
  margin = (boxW - tileW*tilesPerRow) / (tilesPerRow-1)
  for (i = 0; i < tilesA.length; i++) {
    if (!tilesA[i].image) {
      console.log(i)
      console.log(tilesA)
    }
    tilesA[i].scaleX = tileW / tilesA[i].image.width;
    tilesA[i].scaleY = tileW / tilesA[i].image.height;
    tilesA[i].regX = tilesA[i].image.width / 2;
    tilesA[i].regY = tilesA[i].image.height / 2;
    tilesA[i].x = (margin+tileW) * (i % tilesPerRow) + tilesA[i].scaleX*tilesA[i].regX;
    tilesA[i].y = (margin+tileW) * Math.floor(i / tilesPerRow) + tilesA[i].scaleY*tilesA[i].regY;
    // These copies are used to preserve the initial coordinates on drag 'n' drop
    tilesA[i].savedX = tilesA[i].x
    tilesA[i].savedY = tilesA[i].y
    // These copies are used to preserve the original scale on mouseover
    tilesA[i].savedscaleX = tilesA[i].scaleX;
    tilesA[i].savedscaleY = tilesA[i].scaleY;
    tilesA[i].cache(0, 0, tilesA[i].image.width, tilesA[i].image.height)
  }
}

function alignRegion(r) {
  if (r.box) {
    r.box.x = r.x;
    r.box.y = r.y;
    r.box.alpha = 0.5;
    r.box.graphics.clear();
    r.box.graphics.beginStroke("#000");
    r.box.graphics.setStrokeStyle(1);
    r.box.graphics.beginFill(r.color).drawRoundRect(
      0, 0, r.gx*r.ts + (r.gx+1)*r.ma, r.gy*r.ts + (r.gy+1)*r.ma, r.ma);
  }
  r.cont.x = r.x + r.ma;
  r.cont.y = r.y + r.ma;
  alignTiles(r.tiles, r.ts, r.gx*r.ts + (r.gx-1)*r.ma);
}

function resize() {
  // Resize the canvas element
  winratio = window.innerWidth/window.innerHeight;
  if (winratio >= ratio) {
    stage.canvas.height = window.innerHeight;
    stage.canvas.width = stage.canvas.height * ratio;
  } else {
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = stage.canvas.width / ratio;
  }

  // If loadComplete() hasn't been called yet, the rest of the items aren't available
  if (!("box" in r1)) {
    statusText.x = stage.canvas.width / 2;
    statusText.y = stage.canvas.height / 2;
    statusText.font = parseInt(stage.canvas.height/10) + "px Arial";
    return;
  }

  // Region1
  // We want to fit gx tiles, plus 2 for spacing.
  r1gx = 8;
  r1.ts = Math.floor(stage.canvas.width / (r1gx + 2));
  r1.bs = stage.canvas.width - r1gx * r1.ts;  // Total blank space
  // This depicts the vertical margins between the tiles
  r1.ma = r1.bs / (5 + (1 + (r1gx - 1) + 1) + 5);
  r1.x = 5 * r1.ma + (8-lvl.word.length)*r1.ts/2;
  r1.y = 2*r1.ma;
  alignRegion(r1);

  // Region2
  r2.ts = r1.ts;
  r2.ma = r1.ma;
  r2.x = r1.x;
  r2.y = r1.y + r1.gy*r1.ts + (r1.gy+5)*r1.ma;
  alignRegion(r2);

  // Region3
  r3.ts = r1.ts*8/10;
  r3.ma = r1.ma*8/10;
  r3.x = 5 * r1.ma;
  r3.y = r2.y + r2.gy*r2.ts + (r2.gy+5)*r2.ma;
  alignRegion(r3);

  // Region4
  r4.ts = stage.canvas.height / 10;
  r4.ma = r4.ts / 5;
  r4.x = 0;
  r4.y = stage.canvas.height - r4.ts - 2*r4.ma;
  alignRegion(r4);
  // Make space for the level
  r4.tiles[r4.tiles.length-1].x += r4.ts + r4.ma;

  lvlText.text = level + 1;
  lvlText.x = parseInt(4.5*(r4.ma+r4.ts) + r4.ma/2);
  lvlText.y = stage.canvas.height - r4.ma/2 - r4.ts/2;
  lvlText.font = parseInt(2*r4.ts/2) + "px Arial";

  // If level is single digit, move lvlText and bar_previous a bit left
  if (level + 1 < 10) {
    lvlText.x -= r4.ts/4;
    r4.tiles[r4.tiles.length-1].x -= r4.ts/2;
  }

  imgSuccess.scaleY = (2/3) * stage.canvas.height / imgSuccess.image.height;
  imgSuccess.scaleX = imgSuccess.scaleY;
  imgSuccess.regX = imgSuccess.image.width / 2;
  imgSuccess.regY = imgSuccess.image.height / 2;
  imgSuccess.x = stage.canvas.width / 2;
  imgSuccess.y = stage.canvas.height / 2;

  statusText.text = "Επίπεδο: " + (level + 1);
  statusText.x = stage.canvas.width - r4.ma;
  statusText.y = stage.canvas.height - r4.ma;
  statusText.font = parseInt(r4.ts/2) + "px Arial";

  // Fill all the canvas with the background
  bg.scaleX = stage.canvas.width / bg.image.width;
  bg.scaleY = stage.canvas.height / bg.image.height;
  bg.cache(0, 0, bg.image.width, bg.image.height);

  stage.update();
}

dx = 5;
function tick() {
  if (endGame) {
     imgSuccess.scaleX *= 1.01;
     imgSuccess.scaleY *= 1.01;
  }
  else if (r1.selectedTile) {
    r1.selectedTile.rotation += dx;
    if (Math.abs(r1.selectedTile.rotation) > 10)
      dx = -dx;
  }
  statusText.text = "Επίπεδο: " + (level + 1 ) + ', fps: ' + Math.round(createjs.Ticker.getMeasuredFPS());
  stage.update();
}

// Return a shuffled copy of an array.
function shuffle(a) {
    var result = a;
    var i, j, temp;

    for (i = 0; i < result.length; i++) {
        j = random(result.length);
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

// If word="ΓΑΤΑ" and tilesNum=10, return e.g. "ιδσΑωΓθΤρπ".toUpperCase(),
// i.e. all the 3 characters from word, and 7 additional random chars.
function generate_stock(word, tilesNum) {
  var i, j, temp;
  var result, inword, outword;  // Those are arrays, not strings

  // Verify that all the characters of `word` exit in alphabet
  for (i = 0; i < word.length; i++)
    if (alphabet.indexOf(word.charAt(i)) < 0) {
      alert(`Internal error: ${word} contains characters not in alphabet!`);
      return
    }
  // Shuffle the alphabet so that afterwards the outword chars are shuffled
  result = shuffle(alphabet.split(''));
  // Split the shuffled alphabet into two arrays, inword and outword
  inword = [];
  outword = [];
  for (i = 0; i < result.length; i++) {
    if (word.indexOf(result[i]) >= 0)
      inword.push(result[i])
    else
      outword.push(result[i])
  }
  // Merge all of inword and some of outword
  result = inword.concat(outword.slice(0, tilesNum - inword.length))
  // Finally, reshuffle
  result = shuffle(result)
  // Return it as a string
  return result.join('')
}

function initLevel(newLevel) {
  // Internal level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  var numLevels = 10;
  level = (newLevel + numLevels) % numLevels;

  // lvl = 0..1: 4 letter words
  // lvl = 2..3: 5 letter words
  // lvl = 4..5: 6 letter words
  // lvl = 6..7: 7 letter words
  // lvl = 8..9: 8 letter words
  lvl = {};
  // Starting point, in tuxtype:
  // for w in $(awk 'length($0) == 4' animals.txt colors.txt fruit.txt plants.txt trees.txt | sort -u); do echo -n "'$w', "; done
  words = [
    ['ΑΡΝΙ', 'ΒΟΔΙ', 'ΒΟΔΙ', 'ΓΑΤΑ', 'ΓΚΡΙ', 'ΔΡΥΣ', 'ΕΛΙΑ', 'ΙΤΙΑ', 'ΚΑΦΕ', 'ΛΑΜΑ', 'ΜΗΛΟ', 'ΜΠΛΕ', 'ΜΥΓΑ', 'ΡΟΔΙ', 'ΡΥΖΙ', 'ΣΥΚΟ', 'ΦΙΔΙ','ΧΕΛΙ', 'ΧΗΝΑ', 'ΨΑΡΙ'],
    ['ΑΕΤΟΣ', 'ΑΛΟΓΟ', 'ΑΣΒΟΣ', 'ΑΣΗΜΙ', 'ΑΣΠΡΟ', 'ΔΑΦΝΗ', 'ΕΛΑΤΟ', 'ΕΛΑΦΙ', 'ΕΛΑΦΙ', 'ΖΕΒΡΑ', 'ΙΩΔΕΣ', 'ΚΙΤΡΟ', 'ΚΟΑΛΑ', 'ΚΥΑΝΟ', 'ΛΑΓΟΣ', 'ΛΕΥΚΑ', 'ΛΥΚΟΣ', 'ΛΩΤΟΣ', 'ΜΑΥΡΟ', 'ΜΟΥΡΟ', 'ΠΑΝΤΑ', 'ΠΑΠΙΑ', 'ΠΕΥΚΟ', 'ΠΙΚΕΑ', 'ΥΑΙΝΑ', 'ΦΙΚΟΣ', 'ΦΩΚΙΑ', 'ΧΡΥΣΟ'],
    ['ΑΖΑΛΕΑ', 'ΑΚΑΚΙΑ', 'ΑΛΕΠΟΥ', 'ΑΝΑΝΑΣ', 'ΑΡΑΧΝΗ', 'ΑΧΙΝΟΣ', 'ΑΧΛΑΔΙ', 'ΒΟΥΡΛΑ', 'ΓΑΖΕΛΑ', 'ΓΕΡΑΚΙ', 'ΓΕΡΑΝΙ', 'ΓΛΑΡΟΣ', 'ΔΕΝΔΡΟ', 'ΚΑΜΗΛΑ', 'ΚΑΡΥΔΑ', 'ΚΕΔΡΟΣ', 'ΚΕΡΑΣΙ', 'ΚΟΜΠΡΑ', 'ΚΟΡΑΚΙ', 'ΚΡΑΝΙΑ', 'ΚΡΙΑΡΙ', 'ΚΡΙΝΟΣ', 'ΚΡΙΝΟΣ', 'ΚΡΟΚΟΣ', 'ΚΥΔΩΝΙ', 'ΚΥΚΝΟΣ', 'ΛΕΜΟΝΙ', 'ΛΟΥΙΖΑ', 'ΛΥΓΚΑΣ', 'ΜΑΝΓΚΟ', 'ΜΟΛΟΧΑ', 'ΜΟΥΡΙΑ', 'ΝΤΑΛΙΑ', 'ΠΑΓΩΝΙ', 'ΠΑΝΣΕΣ', 'ΠΑΤΑΤΑ', 'ΠΕΠΟΝΙ', 'ΡΙΓΑΝΗ', 'ΣΚΝΙΠΑ', 'ΣΚΥΛΟΣ', 'ΣΠΙΝΟΣ', 'ΣΦΗΓΚΑ', 'ΤΑΥΡΟΣ', 'ΤΙΓΡΗΣ', 'ΧΕΛΩΝΑ'],
    ['ΑΓΕΛΑΔΑ', 'ΑΜΠΕΛΙΑ', 'ΑΡΚΟΥΔΑ', 'ΑΣΤΑΚΟΣ', 'ΑΧΛΑΔΙΑ', 'ΒΙΟΛΕΤΑ', 'ΒΙΣΩΝΑΣ', 'ΒΥΣΣΙΝΟ', 'ΓΕΡΑΝΟΣ', 'ΓΙΑΣΕΜΙ', 'ΓΟΡΙΛΑΣ', 'ΔΕΛΦΙΝΙ', 'ΕΡΩΔΙΟΣ', 'ΚΑΒΟΥΡΙ', 'ΚΑΜΕΛΙΑ', 'ΚΑΡΥΔΙΑ', 'ΚΑΣΤΑΝΟ', 'ΚΑΤΣΙΚΑ', 'ΚΕΡΑΣΙΑ', 'ΚΙΤΡΙΝΟ', 'ΚΟΚΚΙΝΟ', 'ΚΟΡΑΚΑΣ', 'ΚΟΥΝΑΒΙ', 'ΚΟΥΝΕΛΙ', 'ΛΕΒΑΝΤΑ', 'ΛΟΥΛΑΚΙ', 'ΜΑΝΟΛΙΑ', 'ΜΕΔΟΥΣΑ', 'ΜΕΛΙΣΣΑ', 'ΜΕΝΕΞΕΣ', 'ΜΠΑΝΑΝΑ', 'ΝΤΟΜΑΤΑ', 'ΟΡΧΙΔΕΑ', 'ΠΑΙΩΝΙΑ', 'ΠΕΡΔΙΚΑ', 'ΠΙΘΗΚΟΣ', 'ΠΟΝΤΙΚΙ', 'ΠΟΡΦΥΡΑ', 'ΠΡΑΣΙΝΟ', 'ΠΡΟΒΑΤΟ', 'ΣΤΑΦΥΛΙ', 'ΣΤΡΕΙΔΙ', 'ΤΣΑΚΑΛΙ', 'ΦΑΛΑΙΝΑ', 'ΦΑΣΟΛΙΑ', 'ΦΡΑΟΥΛΑ'],
    ['ΑΝΘΡΩΠΟΣ', 'ΑΝΤΙΛΟΠΗ', 'ΑΣΤΕΡΙΑΣ', 'ΒΑΤΡΑΧΟΣ', 'ΒΕΡΙΚΟΚΟ', 'ΒΟΥΒΑΛΟΣ', 'ΓΑΙΔΟΥΡΙ', 'ΓΑΡΔΕΝΙΑ', 'ΓΕΒΡΙΛΟΣ', 'ΓΟΥΡΟΥΝΙ', 'ΕΝΥΔΡΙΔΑ', 'ΙΝΔΟΣΥΚΗ', 'ΚΑΡΠΟΥΖΙ', 'ΚΑΣΤΟΡΑΣ', 'ΚΟΥΝΟΥΠΙ', 'ΚΟΥΡΟΥΝΑ', 'ΛΙΟΝΤΑΡΙ', 'ΜΠΑΝΑΝΙΑ', 'ΜΥΡΜΗΓΚΙ', 'ΜΥΡΤΙΛΟΣ', 'ΠΕΤΟΥΝΙΑ', 'ΠΛΑΤΑΝΟΣ', 'ΠΟΝΤΙΚΟΣ', 'ΡΟΔΑΚΙΝΟ', 'ΣΚΙΟΥΡΟΣ', 'ΣΠΑΡΑΓΓΙ', 'ΣΦΕΝΔΑΜΙ', 'ΦΟΙΝΙΚΑΣ', 'ΧΕΛΙΔΟΝΙ'],
    ['ΑΚΤΙΝΙΔΙΟ', 'ΑΣΦΟΔΕΛΟΣ', 'ΒΑΣΙΛΙΚΟΣ', 'ΒΑΤΟΜΟΥΡΟ', 'ΒΕΛΑΝΙΔΙΑ', 'ΓΑΛΟΠΟΥΛΑ', 'ΔΑΜΑΣΚΗΝΟ', 'ΕΛΕΦΑΝΤΑΣ', 'ΙΑΓΟΥΑΡΟΣ', 'ΚΑΝΓΚΟΥΡΩ', 'ΚΑΡΧΑΡΙΑΣ', 'ΚΑΤΣΑΡΙΔΑ', 'ΚΟΛΟΚΥΘΙΑ', 'ΚΟΤΟΠΟΥΛΟ', 'ΚΟΥΜΚΟΥΑΤ', 'ΚΥΚΛΑΜΙΝΟ', 'ΚΥΠΑΡΙΣΣΙ', 'ΜΑΙΝΤΑΝΟΣ', 'ΜΑΝΤΑΡΙΝΙ', 'ΜΑΡΓΑΡΙΤΑ', 'ΜΠΙΓΚΟΝΙΑ', 'ΝΕΚΤΑΡΙΝΙ', 'ΝΥΧΤΕΡΙΔΑ', 'ΠΑΠΑΓΑΛΟΣ', 'ΠΕΛΕΚΑΝΟΣ', 'ΠΕΡΙΣΤΕΡΑ', 'ΠΕΡΙΣΤΕΡΙ', 'ΠΕΤΑΛΟΥΔΑ', 'ΠΟΡΤΟΚΑΛΙ', 'ΡΙΝΟΚΕΡΟΣ', 'ΣΑΛΙΓΚΑΡΙ', 'ΣΚΥΛΟΨΑΡΟ', 'ΣΠΟΥΡΓΙΤΙ', 'ΦΛΑΜΙΝΓΚΟ', 'ΦΛΑΜΟΥΡΙΑ'],
    ['ΑΛΙΓΑΤΟΡΑΣ', 'ΑΡΑΒΟΣΙΤΟΣ', 'ΓΑΡΥΦΑΛΛΙΑ', 'ΓΑΤΟΠΑΡΔΟΣ', 'ΓΛΑΡΟΠΟΥΛΙ', 'ΙΠΠΟΚΑΜΠΟΣ', 'ΚΟΡΜΟΡΑΝΟΣ', 'ΛΕΟΠΑΡΔΑΛΗ', 'ΠΑΣΧΑΛΙΤΣΑ', 'ΠΙΓΚΟΥΙΝΟΣ']
  ];

  category_words = words[Math.floor(level/2)];
  lvl.word = category_words[random(category_words.length)];
  lvl.stock = generate_stock(lvl.word, 10)
  console.log(lvl.word, lvl.stock);

  // Region1
  r1.tilesNum = lvl.word.length;
  r1.gx = lvl.word.length;
  r1.gy = 1;
  for (i = 0; i < r1.tiles.length; i++)
    if (i < r1.tilesNum)
      r1.tiles[i].image = imgByName(
        "p" + alphabet.indexOf(lvl.word.charAt(i)) + ".png")
    else
      r1.tiles[i].image = imgByName("p_blank.png");

  // Region2
  r2.tilesNum = lvl.word.length;
  r2.gx = lvl.word.length;
  r2.gy = 1;
  for (i = 0; i < r2.tiles.length; i++)
    if (i < r2.tilesNum)
      r2.tiles[i].image = imgByName("l_placeholder.svg")
    else
      r2.tiles[i].image = imgByName("l_blank.svg");

  // Region3
  r3.tilesNum = 10;
  r3.gx = 10;
  r3.gy = 1;
  for (i = 0; i < r3.tiles.length; i++)
      r3.tiles[i].image = imgByName(
        "l" + alphabet.indexOf(lvl.stock.charAt(i)) + ".svg")

  // Region4
  r4.tilesNum = 5;
  r4.gx = 5;
  r4.gy = 1;
  endGame = false;
  imgSuccess.image = resources[resourceNames.indexOf("flower_good.svg") + random(2)];
  imgSuccess.visible = false;
  if (r1.selectedTile) {
    r1.selectedTile.rotation = 0;
    r1.selectedTile = null;
  }
  resize();
}

function checkEndGame() {
  endGame = true;
  for (i = 0; i < r1.tilesNum; i++) {
    // Compare only numbers, e.g. "l0.svg" != "p0.png" becomes "0" != "0".
    if (r1.tiles[i].image.rname.replace(/\D/g,'') !=
        r2.tiles[i].image.rname.replace(/\D/g,''))
      endGame = false;
  }
  if (endGame) {
    imgSuccess.visible = true;
    setTimeout(onMenuNext, 3000);
    stage.update();
  }
}
