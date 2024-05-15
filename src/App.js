import './App.css';
import { FabricJSCanvas } from './components/canvas.js';
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

// https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQLzzJr2hfB8D9UkamsuO8NwMn3b6CwsxzQTeQNx6tKyiwmIcQL

// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

const App = () => {
    const [canvas, setCanvas] = useState('');
    const [imgURL, setImgURL] = useState('');


    const img = new Image();
    img.src = 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQLzzJr2hfB8D9UkamsuO8NwMn3b6CwsxzQTeQNx6tKyiwmIcQL';


    useEffect(() => {
        setCanvas(initCanvas());
    }, []); 
    
    const initCanvas = () => (
        new fabric.Canvas('canvas', {
            height: 800,
            width: 800,
            backgroundImage:'https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*'
        })
        // backgroundImage:'https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*'
    )

    const setBackground = canvi => {
        console.log('setBackground')
        canvi.setBackgroundImage('https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg?crop=0.752xw:1.00xh;0.175xw,0&resize=1200:*');
    }
    
    const addRect = canvi => {
        // const rect = new fabric.Rect({
        //   height: 280,
        //   width: 200,
        //   fill: 'yellow'
        // });
        const fabricimg = new fabric.Image(img);
        fabricimg.scale(0.1);
        fabricimg.moveCursor = 'pointer';

        canvi.add(fabricimg);
        canvi.renderAll();
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

    // return (
    //     <div>
    //         <canvas id="canvas" />
    //         <button onClick={() => addImg(canvas)}>Add Image</button>
    //     </div>
    // )
    return(
      <div>
        <h1>react sux</h1>
        <button onClick={() => addRect(canvas)}>Rectangle</button>
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
       <br/><br/>
       <canvas id="canvas" />
      </div>
    );
  }
export default App;
