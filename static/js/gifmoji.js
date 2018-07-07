
var nEmojisToUse = 1000; // max: 900 (ignores values larger)
var stepSize = 16; // size of rendered emoji
// var pixelStepSize = 2; // step size over pixels

var backgroundColor = 50;
var emojiSize = 32;
var emojisPerRow = 30;
var showEmojis = false;
var emojis; // image of all 32x32 emojis
var emojiMeanColors; // array of mean color values for all emojis

var timestep = 0;
var maxTimestep;

var canvas;
var canvasWidth;
var canvasHeight;
var cap;
var curPatch;
var curCapture;
var emojiIndex;
var emojiIndices = [];
var cxs = [];
var cys = [];
var curMeanClrs = [];

function preload() {
  emojis = loadImage("static/emojis.png");
}

// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }

function setup() {
  canvasWidth = windowWidth;
  canvasHeight = Math.round((canvasWidth/2)/1.3333);
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('sketch-holder');
  cap = createCapture(VIDEO);
  cap.hide();
  cap.size(canvas.width/2, canvas.height);
  rectMode(CENTER);
  noStroke();  
  emojiMeanColors = loadEmojiMeanColors(emojis);
  if (nEmojisToUse > emojiMeanColors.length) {
    emojiMeanColors = emojiMeanColors.slice(0, nEmojisToUse);
  }
  text('loading gifmoji...', cap.width/2, cap.height/2);
}

function saveImage() {
  saveCanvas(canvas, 'gifmoji', 'png');
}

function mouseClicked() {
  if (showEmojis) {
    showEmojis = false;
    console.log('switch to live mode');
  } else {
    showEmojis = true;
    console.log('switch to still mode');
  }
}

function draw() {
  if (showEmojis) {
  } else {
    gifmojify();
    // image(cap, 0, 0);
    // text('(press right arrow to gifmojify)', cap.width/2, cap.height/2);
  }
  // image(cap, 0, 0);
  image(cap, canvas.width/2, 0);
}

function gifmojify() {
  // background(backgroundColor);
  captureToEmojis(cap, stepSize);
  return;
  curCapture = createImage(cap.width, cap.height);
  if (curCapture.width > 0) {
    curCapture.loadPixels();
    cap.loadPixels();
    for (var i = 0; i < curCapture.pixels.length; i += 1) {
      curCapture.pixels[i] = cap.pixels[i];
    }
    curCapture.updatePixels();
    captureToEmojis(curCapture, stepSize);
  }
}

function captureToEmojis(cap, stepSize) {
  // emojiIndex = 1;
  // var i = 0;
  // for (var cy = 0; cy < cap.height; cy += stepSize) {
    // for (var cx = 0; cx < cap.width; cx += stepSize) {

  // var cty = random(0, stepSize*Math.floor(cap.height/stepSize));
  // var ctx = random(0, stepSize*Math.floor(cap.width/stepSize));
  for (var cy = 0; cy < cap.height; cy += stepSize) {
    for (var cx = 0; cx < cap.width; cx += stepSize) {
      curPatch = cap.get(cx, cy, stepSize, stepSize);
      if (curPatch.width > 0) {
        curPatch.loadPixels();
        updateBlockWithEmoji(cx, cy,
          findIndexOfClosestMean(avgColorInImage(curPatch),
            emojiMeanColors), emojis);
      }
    }
  }
}

function loadEmojiMeanColors(emojis) {
  // might actually use loadFont and somehow get pixels of emojis?
  var emojiMeans = [];
  var curEmoji;
  for (var cy = 0; cy < emojis.height; cy += emojiSize) {
    for (var cx = 0; cx < emojis.width; cx += emojiSize) {
      curEmoji = emojis.get(cx, cy, emojiSize, emojiSize);
      append(emojiMeans, avgColorInImage(curEmoji));
    }
  }
  return emojiMeans;
}

function avgColorInImage(img){
  img.loadPixels();
  var r = 0, g = 0, b = 0, a = 0;
  for (var c = 0; c < img.pixels.length-3; c += 4) {
    r += img.pixels[c];
    g += img.pixels[c+1];
    b += img.pixels[c+2];
    a += img.pixels[c+3];
  }
  n = img.pixels.length/4;
  var clr = color(r/n, g/n, b/n, a/n);
  return clr
}

function findIndexOfClosestMean(mu, mus) {
  // find i = argmin sum((mu - mus[i])^2) for colors
  var lowestIndex = 0;
  var lowestVal = Infinity;
  var curVal;
  for (var i = 1; i < mus.length; i++) {
    curVal = distBetweenColors(mu, mus[i]);
    if (curVal < lowestVal) { 
      lowestIndex = i;
      lowestVal = curVal;
    }
  }
  return lowestIndex;
}

function distBetweenColors(a, b) {
  return dist(a.levels[0], a.levels[1], a.levels[2], b.levels[0], b.levels[1], b.levels[2]);
}

function updateBlockWithEmoji(cx, cy, emoji_index, emojis) {
  // https://p5js.org/reference/#/p5/image

  erow = Math.floor(emoji_index/emojisPerRow);
  ecol = emoji_index % emojisPerRow;
  px = ecol*emojiSize;
  py = erow*emojiSize;
  image(emojis, cx, cy, stepSize, stepSize, px, py, emojiSize, emojiSize);

}
