// todo: only read left-click (not right click)
// or just use spacebar?

var nEmojisToUse = 1000; // max: 900 (ignores values larger)
var stepSize = 8; // size of rendered emoji
var pixelStepSize = 1; // step size over pixels in emojis
var saveEveryKFrames = 3; // number of frames to skip in gifs

var widthMult = 0.4;
var backgroundColor = 50;
var emojiSize = 32;
var emojisPerRow = 30;
var showEmojis = false;
var emojis; // image of all 32x32 emojis
var emojiMeanColors; // array of mean color values for all emojis

var recording = false;
var gif;
var nGifFrames = 0;
var maxGifFrames = 15;

var canvas;
var canvasWidth;
var canvasHeight;
var capture;
var curCapture;
var emojiIndex;

function preload() {
  emojis = loadImage("static/emojis.png");
}

function windowResized() {
  canvasWidth = Math.round(widthMult*windowWidth);
  canvasHeight = Math.round((canvasWidth/2)/1.3333);
  resizeCanvas(canvasWidth, canvasHeight);
  // capture.size(canvasWidth/2, canvasHeight);
}

function setup() {
  canvasWidth = Math.round(widthMult*windowWidth);
  canvasHeight = Math.round((canvasWidth/2)/1.3333);
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('sketch-holder');
  capture = createCapture(VIDEO);
  capture.hide();
  capture.size(canvasWidth/2, canvasHeight);
  rectMode(CENTER);
  noStroke();  
  emojiMeanColors = loadEmojiMeanColors(emojis);
  if (nEmojisToUse > emojiMeanColors.length) {
    emojiMeanColors = emojiMeanColors.slice(0, nEmojisToUse);
  }
  $('.recording-status').html('Click to start recording a gifmoji.');
  setupGif();
}

function setupGif() {
  // https://gist.github.com/antiboredom/129fd2311dec0046603e
  // https://github.com/jnordberg/gif.js
  gif = new GIF({
    workers: 2,
    quality: 40,
    workerScript: "static/js/gif.worker.js"
  });

  gif.on('finished', function(blob) {
    // add created image to html

    newimg = "<img id='gif-holder' src='" + URL.createObjectURL(blob) + "'></img>";
    $('#gif-container').append(newimg);
    // $('#gif-holder').attr("src", URL.createObjectURL(blob));
    // set width to canvas width
    // $('#gif-holder').css("width", $('#sketch-holder').css("width")/2);
    // $('#gif-holder').css("width", canvasWidth);
    $('.recording-status').html('Right-click on the gif to save. Or click to make a new one.');
    setupGif();
  });
}

function stopRecording() {
  recording = false;
  console.log('rendering');
  $('.recording-status').html('Calling gifmoji...');
  gif.render();
}

function mousePressed() {
  if (recording) {
    stopRecording();
  } else {
    nGifFrames = 0;
    recording = true;
    console.log('recording');
    $('.recording-status').html('Recording! Click to stop.');
  }
}

function draw() {
  gifmojify();
  image(capture, canvas.width/2, 0);
  if (recording && frameCount % saveEveryKFrames == 0) {
    nGifFrames += 1;
    gif.addFrame(canvas.elt, {delay: 1, copy: true});
    if (nGifFrames > maxGifFrames) { stopRecording(); }
  }
}

function gifmojify() {
  background(backgroundColor);
  // captureToEmojis(capture, stepSize);

  // surprisingly, this is faster than operating on cap
  curCapture = createImage(capture.width, capture.height);
  if (curCapture.width > 0) {
    curCapture.loadPixels();
    capture.loadPixels();
    for (var i = 0; i < curCapture.pixels.length; i += 1) {
      curCapture.pixels[i] = capture.pixels[i];
    }
    curCapture.updatePixels();
    captureToEmojis(curCapture, stepSize);    
  }
}

function captureToEmojis(curCap, stepSize) {
  curCap.loadPixels();
  for (var cy = 0; cy < curCap.height; cy += stepSize) {
    for (var cx = 0; cx < curCap.width; cx += stepSize) {
      curMeanClr = avgColorOfCurPatch(curCap, cx, cy, stepSize);
      emojiIndex = findIndexOfClosestMean(curMeanClr, emojiMeanColors);
      updatePatchWithEmoji(curCap, cx, cy, stepSize, emojiIndex);
    }
  }
  curCap.updatePixels();
  image(curCap, 0, 0);
}

function avgColorOfCurPatch(curCap, cx, cy, stepSize) {
  var r = 0, g = 0, b = 0, a = 0, n = 0;

  var i, c, ci, px, py;
  for (var ix = 0; ix < stepSize; ix += 1) {
    for (var iy = 0; iy < stepSize; iy += 1) {
      px = cx + ix;
      py = cy + iy;

      c = px + (py-1)*curCap.width;
      i = 4*c;
      if (i+3 >= curCap.pixels.length) { continue; }
      if (isNaN(curCap.pixels[i])) { continue; }
      r += curCap.pixels[i];
      g += curCap.pixels[i+1];
      b += curCap.pixels[i+2];
      a += curCap.pixels[i+3];
      n += 1;
    }
  }
  if (n > 0) {
    var clr = color(r/n, g/n, b/n, a/n);
  } else {
    var clr = color(0, 0, 0, 0);
  }
  return clr;
}

function updatePatchWithEmoji(curCap, cx, cy, stepSize, emojiIndex) {
  erow = Math.floor(emojiIndex/emojisPerRow);
  ecol = emojiIndex % emojisPerRow;
  var ex = ecol*emojiSize;
  var ey = erow*emojiSize;

  var i, c, e, ci, px, py;
  for (var ix = 0; ix < stepSize; ix += 1) {
    for (var iy = 0; iy < stepSize; iy += 1) {
      px = cx + ix;
      py = cy + iy;

      c = px + (py-1)*curCap.width;
      i = 4*c;
      if (i+3 >= curCap.pixels.length) { continue; }
      if (isNaN(curCap.pixels[i])) { continue; }

      epx = ex + (emojiSize/stepSize)*ix;
      epy = ey + (emojiSize/stepSize)*iy;
      e = 4*(epx + (epy-1)*emojis.width);
      curCap.pixels[i] = emojis.pixels[e];
      curCap.pixels[i+1] = emojis.pixels[e+1];
      curCap.pixels[i+2] = emojis.pixels[e+2];
      curCap.pixels[i+3] = emojis.pixels[e+3];
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
      emojiMeans.push(avgColorInImage(curEmoji));
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
  return clr;
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
