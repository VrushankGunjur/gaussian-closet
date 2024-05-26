import './App.css';
import SegmentCanvas from './components/SegmentCanvas.js';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// https://aprilescobar.medium.com/part-3-fabric-js-on-react-fabric-image-fromurl-4185e0d945d3

const App = () => {
    const [waitingID, setWaitingID] = useState('');
    const [backendURL, setBackendURL] = useState('http://127.0.0.1:5000');
    const [outputImg, setOutputImg] = useState('');
    const [outputImgPresent, setOutputImgPresent] = useState(false);

    let c1, c2;
    
    const updateC1 = (input) => {
      console.log("this is the parent. canvas here updated")
      c1 = input; 
    }

    const updateC2 = (input) => {
      c2 = input; 
    }

    const getPositions = () => {
      if (typeof c1 !== "undefined") {
        console.log(c1);
        console.log("c1 Size: ", c1.width, c1.height);

        c1.getObjects().forEach(function(object) {
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

      if (typeof c2 !== "undefined") {
        console.log(c2);
        console.log("c2  Size: ", c2.width, c2.height);

        c2.getObjects().forEach(function(object) {
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
    }
    
    const postData = async () => {
      if (typeof c1 == "undefined" || typeof c2 == "undefined") {
        return;
      }

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
      let paths1 = [];
      let paths2 = [];

      c1.getObjects().forEach(function(object) {
        if ("path" in object) {
          paths1.push(object.toSVG());
        } else {
          urls.push(object._element.currentSrc);
          coords.push(object.lineCoords)
        }
      });

      c2.getObjects().forEach(function(object) {
        if ("path" in object) {
          paths2.push(object.toSVG());
        } else {
          urls.push(object._element.currentSrc);
          coords.push(object.lineCoords)
        }
      });

      let data = {
        bg_image_url: c1.backgroundImage._element.src,
        fg_image_url: c2.backgroundImage._element.src,
        bg_path: paths1[0],
        fg_path: paths2[0]
      }

      console.log(data)

      try {
        const response = await client.post("/in_fill", data);        
        setOutputImg(`data:image/jpeg;base64,${response.data.image}`);

        console.log("got a response!", response.data);
	setOutputImgPresent(true);
        setWaitingID(response.data.id);
      } catch (err) {
        console.error("Error posting data:", err);
        throw err;
      }
    }

    return(
      <div class="container">
        <p>The only buttons you'll ever need</p>
	<input type="text" value={backendURL} onChange={e => setBackendURL(e.target.value)}></input>
        <button onClick={() => postData()}>Post Data</button>
        <button onClick={() => getPositions()}>Get All Positions</button>
        <div>
          {outputImgPresent ? (<div><img src={outputImg}/></div>) : (<div></div>)}
        </div>
        <SegmentCanvas cid={"bg"} updateCanvas={updateC1}/>
        <SegmentCanvas cid={"fg"} updateCanvas={updateC2}/>
      </div>
    );
  }
export default App;
