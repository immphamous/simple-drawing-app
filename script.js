const canvas = document.getElementById("canvas");

const resizeView = document.getElementById("resize-view");
const resizerButton = document.getElementById("resizer-button");

canvas.width = 260;
canvas.height = 160;

resizeView.style.width = canvas.width;
resizeView.style.height = canvas.height;

var rect = canvas.getBoundingClientRect();

var resizing = false;

const history = [];
var back = 0;
var curTool;
select("pen");

resizeView.style.left = rect.left;
resizeView.style.top = rect.top;

resizerButton.style.left = rect.right - rect.left + 4;
resizerButton.style.top = rect.bottom - rect.top + 4;

// tools

historyPush();

function historyPush() {
    if(back < history.length - 1) {
        var amount = history.length - back - 1;
        for(let i = 0; i < amount; i++) {
            history.pop();
        }
    }
    back = history.length;

    history.push(canvas.toDataURL());

    console.log(history);
}

function undo() {
    if(back <= 0) return;
    back--;

    drawHistory();
}

function redo() {
    if(back >= history.length - 1) return;
    back++;
    
    drawHistory();
}

function drawHistory() {
    var historicImage = new Image();
    historicImage.src = history[back];
    historicImage.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(historicImage, 0, 0);
    }
}

function download() {
    var link = document.createElement("a");
    var data = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");

    link.download = "download.png"
    link.href = data;
    link.click();
}

function select(name) {
    var buttons = document.getElementsByClassName("tool-button");
    for(let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("tool-button-selected");
    }

    var button = document.getElementById(name + "-tool");
    button.classList.add("tool-button-selected");

    curTool = name;
}


function drag(e) {
    resizeView.style.width = e.clientX - canvas.offsetLeft - 4;
    resizeView.style.height = e.clientY - canvas.offsetTop - 4;


    resizerButton.style.left = e.clientX - canvas.offsetLeft;
    resizerButton.style.top = e.clientY - canvas.offsetTop;
}

resizerButton.addEventListener("mousedown", (e) => {

    resizing = true;
    resizeView.style.outlineWidth = "1px";
    
    drag(e)
    document.addEventListener("mousemove", drag);
});

function nameToRgba(name) {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.fillStyle = name;
    tempCtx.fillRect(0, 0, 1, 1);
    const tempImgData = tempCtx.getImageData(0, 0, 1, 1);

    return Array.from(tempImgData.data);
}

const ctx = canvas.getContext("2d");

var width = canvas.width;
var height = canvas.height;

var isDrawing = false;
var holdingDownMouse = false;
var lastX = 0;
var lastY = 0;
var curX = 0;
var curY = 0;


var color = "black";
var size = 2;

document.addEventListener("mousemove", function(e) {
    findxy("move", e)
}, false);
document.addEventListener("mousedown", function(e) {
    if(e.target.tagName == "BUTTON") return;
    findxy("down", e)
}, false);
document.addEventListener("mouseup", function(e) {
    if(e.target.tagName == "BUTTON" && e.target.id != "resizer-button") return;

    if(resizing) {
        resizing = false;
        resizeView.style.outlineWidth = "0px";

        document.removeEventListener("mousemove", drag);

        canvas.width = resizeView.clientWidth;
        canvas.height = resizeView.clientHeight;

        
        var rect = canvas.getBoundingClientRect();

        resizerButton.style.left = rect.right - rect.left + 4;
        resizerButton.style.top = rect.bottom - rect.top + 4;
    }

    findxy("up", e)
}, false);
canvas.addEventListener("mouseout", function(e) {
    findxy("out", e)
}, false);
canvas.addEventListener("mouseover", function(e) {
    findxy("over", e)
}, false);

function findxy(res, e) {
    switch(res) {
        case "down":

            lastX = curX;
            lastY = curY;
            curX = e.clientX - canvas.offsetLeft;
            curY = e.clientY - canvas.offsetTop;
            holdingDownMouse = true;
            isDrawing = true;
            
            if(curTool == "bucket") {
                var colorValues = nameToRgba(color);

                var pixelStack = [[curX, curY]];
                var colorLayer = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let startPos = (curY * canvas.width + curX) * 4;
                let startR = colorLayer.data[startPos];
                let startG = colorLayer.data[startPos + 1];
                let startB = colorLayer.data[startPos + 2];
                let startA = colorLayer.data[startPos + 3];
                
                if(colorValues[0] == startR && colorValues[1] == startG && colorValues[2] == startB && colorValues[3] == startA)
                    return;


                while(pixelStack.length) {
                    // console.log(pixelStack.length);

                    var newPos, x, y, pixelPos, reachLeft, reachRight;
                    newPos = pixelStack.pop();
                    x = newPos[0];
                    y = newPos[1];

                    pixelPos = (y*canvas.width + x) * 4;
                    while(y >= 0 && matchStartColor(pixelPos)) {
                        y--;
                        pixelPos -= canvas.width * 4;
                    }
                    y++;
                    pixelPos += canvas.width * 4;
                    reachLeft = false;
                    reachRight = false;
                    while(y < canvas.height && matchStartColor(pixelPos)) {
                        colorPixel(pixelPos);
                        if(x > 0) {
                            if(matchStartColor(pixelPos - 4)) {
                                if(!reachLeft) {
                                    pixelStack.push([x - 1, y]);
                                    reachLeft = true;
                                }
                            } else {
                                reachLeft = false;
                            }
                        }

                        if(x < canvas.width - 1) {
                            if(matchStartColor(pixelPos + 4)) {
                                if(!reachRight) {
                                    pixelStack.push([x + 1, y]);
                                    reachRight = true;
                                }
                            } else {
                                reachRight = false;
                            }
                        }

                        pixelPos += canvas.width * 4;
                        y++;
                    }

                }
                ctx.putImageData(colorLayer, 0, 0);

                function matchStartColor(pixelPos) {
                    var r = colorLayer.data[pixelPos];
                    var g = colorLayer.data[pixelPos+1];
                    var b = colorLayer.data[pixelPos+2];
                    var a = colorLayer.data[pixelPos+3];

                    return (r == startR && g == startG && b == startB && a == startA);
                }

                function colorPixel(pixelPos) {
                    colorLayer.data[pixelPos] = colorValues[0];
                    colorLayer.data[pixelPos+1] = colorValues[1];
                    colorLayer.data[pixelPos+2] = colorValues[2];
                    colorLayer.data[pixelPos+3] = colorValues[3];
                }
            }

            break;
        case "up":
            holdingDownMouse = false;
            isDrawing = false;

            historyPush();
            break
        case "out":
            // isDrawing = false;
            break;
        case "over":
            if (holdingDownMouse && isDrawing == false) {
                curX = e.clientX - canvas.offsetLeft;
                curY = e.clientY - canvas.offsetTop;
                lastX = curX;
                lastY = curY;

                isDrawing = true;
            }
            break;
        case "move":
            lastX = curX;
            lastY = curY;
            curX = e.clientX - canvas.offsetLeft;
            curY = e.clientY - canvas.offsetTop;

            // is holding down
            if(isDrawing && !resizing) {

                if(curTool == "pen") {
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(curX, curY);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = size;

                    ctx.stroke();
                    ctx.closePath();
                } else if(curTool == "eraser") {
                    ctx.clearRect(curX - 2, curY - 2, 4, 4);
                }
            }
            break;
    }
}