import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import axios from 'axios';

// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

const SegmentCanvas = (props) => {
    const [canvas, setCanvas] = useState('');
    const [imgURL, setImgURL] = useState('https://m.media-amazon.com/images/I/81XW83q04fL.jpg');
    const [backgroundURL, setBackgroundURL] = useState('https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*');
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const canvasID = `canvas-${props.cid}`

    // maintain a mapping from URL to objectID?

    useEffect(() => {
        setCanvas(initCanvas());
    }, []);
    
    const initCanvas = () => (
        new fabric.Canvas(canvasID, {
            height: 800,
            width: 800,
            //backgroundImage: backgroundURL,
            backgroundImage:'https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*',
            isDrawingMode: isDrawingMode
        })
    )

    const setBackground = (e, url, canvi) => {
        e.preventDefault();

        console.log(url);
        var img = new Image();
        img.src = url;
        img.onload = function() {
            canvi.setHeight(img.height);
            canvi.setWidth(img.width);
            console.log("Image loaded");
        }

        canvi.setBackgroundImage(url, canvi.renderAll.bind(canvi));
        
        console.log(img.width, img.height);
        canvi.renderAll();
        setBackgroundURL('');        // reset the image URL
        props.updateCanvas(canvi);
    }


    const addImg = (e, url, canvi) => {
        e.preventDefault();
        new fabric.Image.fromURL(url, img => {
          img.scale(0.1);
          img.moveCursor = 'pointer';
          canvi.add(img);
          canvi.centerObject(img);
          canvi.renderAll();
          setImgURL('');        // reset the image URL
        });
        props.updateCanvas(canvi);
    }

    const toggleDrawingMode = () => {
      canvas.isDrawingMode = !canvas.isDrawingMode;
      setIsDrawingMode(canvas.isDrawingMode);
      canvas.freeDrawingBrush.width = 20;
      canvas.freeDrawingBrush.color = "rgba(255,0,0,.5)";
      props.updateCanvas(canvas);
    }

    const getPositions = () => {
        console.log(canvas);
        console.log("Canvas Size: ", canvas.width, canvas.height);

        canvas.getObjects().forEach(function(object) {
          // Object is bounding line
          if ("path" in object) {
            object.fill = 'red';
            console.log(object)
            console.log(object.toClipPathSVG())
            console.log(object.toSVG())
            console.log(object.toDatalessObject())
          }
          
          // Object is a foreground image
          else {
            console.log("Image URL: ", object._element.currentSrc);
            console.log("Coords: ", object.lineCoords);
          }
        });
    }

    return(
      <div>
        <h1>Canvas {props.cid}</h1>
          <div>
          </div>
        <form onSubmit={e => addImg(e, imgURL, canvas)}>
          <div>
            <input 
              type="text" 
              value={imgURL} 
              onChange={ e => setImgURL(e.target.value)} 
            />
            <button type="submit">Add Image</button>
          </div>
        </form>
        <form onSubmit={ f => setBackground(f, backgroundURL, canvas)}>
            <div>
                <input
                    type="text"
                    value={backgroundURL}
                    onChange={ f => setBackgroundURL(f.target.value)}
                />
                <button type="submit">Set Background</button>
            </div>
        </form>
       <br/><br/>
       <button onClick={() => getPositions()}>Get Positions</button>
       <button onClick={() => toggleDrawingMode()}>Toggle Drawing Mode {isDrawingMode ? "(on)" : "(off)"}</button>
       {/* <button onClick={() => dumpPath()}>Dump Path</button> */}
       <canvas id={canvasID} />
      </div>
    );
  }


export default SegmentCanvas;
