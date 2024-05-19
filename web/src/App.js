import './App.css';
import { FabricJSCanvas } from './components/canvas.js';
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

const App = () => {
    const [canvas, setCanvas] = useState('');
    const [imgURL, setImgURL] = useState('');
    const [backgroundURL, setBackgroundURL] = useState('');

    // maintain a mapping from URL to objectID?

    useEffect(() => {
        setCanvas(initCanvas());
    }, []); 
    
    const initCanvas = () => (
        new fabric.Canvas('canvas', {
            height: 800,
            width: 800,
            //backgroundImage: backgroundURL,
            backgroundImage:'https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*'

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

    const getPositions = () => {
        console.log("Canvas Size: ", canvas.width, canvas.height);

        canvas.getObjects().forEach(function(object) {
            console.log("Image URL: ", object._element.currentSrc);
            console.log("Coords: ", object.lineCoords);
        });
    }

    return(
      <div>
        <h1>react sux</h1>
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
       <canvas id="canvas" />
      </div>
    );
  }
export default App;
