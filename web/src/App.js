import './App.css';
import { FabricJSCanvas } from './components/canvas.js';
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import axios from 'axios';

// Front-end logic

async function imageUrlToBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
  });
}


// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

const App = () => {
    const [canvas, setCanvas] = useState('');
    const [imgURL, setImgURL] = useState('https://starwalk.space/gallery/images/what-is-space/1920x1080.jpg');
    const [backgroundURL, setBackgroundURL] = useState('https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*');
    const [backendURL, setBackendURL] = useState('http://127.0.0.1:5000');
    const [waitingID, setWaitingID] = useState('');
    // const [drawingMode, setDrawingMode] = useState(true);

    // maintain a mapping from URL to objectID?

    useEffect(() => {
        setCanvas(initCanvas());
    }, []);
    
    const initCanvas = () => (
        new fabric.Canvas('canvas', {
            height: 800,
            width: 800,
            //backgroundImage: backgroundURL,
            backgroundImage:'https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*',
            isDrawingMode: false
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
    }

    const toggleDrawingMode = () => {
      canvas.isDrawingMode = !canvas.isDrawingMode;
      canvas.freeDrawingBrush.width = 20;
      canvas.freeDrawingBrush.color = "rgba(255,0,0,.5)";
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

    const postData = async () => {
      console.log("Sending post request to backend");
      const client = axios.create({
        baseURL: backendURL + "/api",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": backendURL
        }
      });

      let urls = [];
      let coords = [];
      let paths = [];

      canvas.getObjects().forEach(function(object) {
        if ("path" in object) {
          paths.push(object.toSVG());
        } else {
          urls.push(object._element.currentSrc);
          coords.push(object.lineCoords)
        }
      }); 

      if (urls.length == 0 || paths.length == 0) {
        console.log("No foreground image or masks supplied.");
        return;
      }

      let data = {
        bg_image_url: canvas.backgroundImage._element.src,
        bg_height: canvas.height,
        bg_width: canvas.width,
        fg_image_urls: urls,
        fg_image_coords: coords,
        paths: paths
      };

      console.log(data)

      try {
        const response = await client.post("/in_fill", data);
        console.log(response.data);
        setWaitingID(response.data.id);
      } catch (err) {
        console.error("Error posting data:", err);
        throw err;
      }
    }

    return(
      <div>
        <h1>react sux</h1>
          <div>
            <input type="text"
                   value={backendURL}
                   onChange = { e => setBackendURL(e.target.value) }
            />
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
       <button onClick={() => postData()}>Post Data</button>
       <button onClick={() => toggleDrawingMode()}>Toggle Drawing Mode</button>
       {/* <button onClick={() => dumpPath()}>Dump Path</button> */}
       <canvas id="canvas" />
      </div>
    );
  }
export default App;
