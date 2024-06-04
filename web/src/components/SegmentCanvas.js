import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import axios from 'axios';

// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

// creates an empty mask of w x h dimensions
const createEmptyMask = (w, h) => {
  let l = Array(w).fill(false);
  return Array(h).fill(l);
}

const SegmentCanvas = (props) => {
    const [canvas, setCanvas] = useState('');
    const [imgURL, setImgURL] = useState('https://m.media-amazon.com/images/I/81XW83q04fL.jpg');
    const [backgroundURL, setBackgroundURL] = useState('');
    // const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [prevMask, setPrevMask] = useState('');
    const canvasID = `canvas-${props.cid}`

    // render mask
    if (props.mask !== prevMask) {
      // let mask = props.mask.blob();
      // let mask_url = URL.createObjectURL(mask);
      let mask_url = `data:image/jpeg;base64,${props.mask}`;
      console.log("fg mask url: ", mask_url);
      fabric.Image.fromURL(mask_url, function(img) {
          canvas.add(img);
          canvas.renderAll();
      }, {
        opacity: 0.40
      });
      setPrevMask(props.mask);
    }


    // maintain a mapping from URL to objectID?

    useEffect(() => {
        setCanvas(initCanvas());
    }, []);
    
    const initCanvas = () => {
      let out = new fabric.Canvas(canvasID, {
        height: 800,
        width: 800,
        //backgroundImage: backgroundURL,
        backgroundImage:'',
        isDrawingMode: true 
    })

    out.freeDrawingBrush.width = 3;
    out.freeDrawingBrush.color = "rgba(255,255,255,.5)";
    props.updateCanvas(out);

      return out;
    }
      

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

        console.log(url);

        canvi.setBackgroundImage(url, canvi.renderAll.bind(canvi));
        
        console.log(img.width, img.height);
        canvi.renderAll();
        // setBackgroundURL('');        // reset the image URL
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

    // const toggleDrawingMode = () => {
    //   canvas.isDrawingMode = !canvas.isDrawingMode;
    //   setIsDrawingMode(canvas.isDrawingMode);
    //   canvas.freeDrawingBrush.width = 20;
    //   canvas.freeDrawingBrush.color = "rgba(255,0,0,.5)";
    //   props.updateCanvas(canvas);
    // }

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

    const updateMask = () => {
      console.log('hello')
      let imageData = document.getElementById("hello").getContext("2d").createImageData(800, 800);
      document.getElementById("hello").getContext("2d").fillRect(0, 0, 500, 500)
      // imageData.data = imageData.data[50 * (imageData.width * 4) + 200 * 4 + 2] + 100;
      // console.log(e)
    }

    return(
      <div>
        <h1>{props.cid}: </h1>
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
       {/* <button onClick={() => toggleDrawingMode()}>Toggle Drawing Mode {isDrawingMode ? "(on)" : "(off)"}</button> */}
       {/* <button onClick={() => dumpPath()}>Dump Path</button> */}
       <canvas id={canvasID} onClick={(e) => updateMask(e)} />
       {/* <canvas id="hello"/> */}
       {/* <button onClick={() => updateMask()}>Set Mask</button> */}
      </div>
    );
  }


export default SegmentCanvas;
