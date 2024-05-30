import React, { useState, useRef } from 'react';
import './App.css';
import SegmentCanvas from './components/SegmentCanvas.js';
import Library from './components/Library.js';
import Workspace from './components/Workspace.js';
import PreviewWorkspace from './components/PreviewWorkspace.js';
import { fabric } from 'fabric';
import axios from 'axios';
import { Container, TextField, Button, Typography, Box, Grid, Paper } from '@mui/material';

const App = () => {
    const [waitingID, setWaitingID] = useState('');
    const [backendURL, setBackendURL] = useState('http://34.83.198.73:5000');
    const [outputImg, setOutputImg] = useState('');
    const [outputImgPresent, setOutputImgPresent] = useState(false);
    const [segmentTarget, setSegmentTarget] = useState('');
    // const [cBg, setCBg] = useState('');
    // const [cFg, setCFg] = useState('');
    // const [maskBg, setMaskBg] = useState('');
    // const [maskFg, setMaskFg] = useState('');
    // const [maskID, setMaskID] = useState('');

    // info passed from /segment to /generate that we need to hold on to in the meantime
    const [bg_cloth_id, setBgClothID] = useState('');
    const [fg_cloth_id, setFgClothID] = useState('');
    const [cur_request_id, setCurRequestID] = useState('');
    const [currSegmentType, setCurrSegmentType] = useState('');

    const [clothingItems, setClothingItems] = useState([]);
    const [workspaceCanvas, setWorkspaceCanvas] = useState('');
    const [previewCanvas, setPreviewCanvas] = useState('');
    const previewCanvasRef = useRef(null);


    const murmur = require('murmurhash-js');

    const updateWorkspaceCanvas = (input) => {
        setWorkspaceCanvas(input);
    }

    const updatePreviewCanvas = (input) => {
        setPreviewCanvas(input);
    }

    const addClothingItem = (item) => {
        setClothingItems([...clothingItems, item]);
    }

    const stageClothingItem = (item) => {
        // todo: fill this in. it must 1) add the item to the preview canvas, 2) send the item to the backend for segmentation
    }

    const removeClothingItem = (index) => {
        const updatedItems = clothingItems.filter((_, i) => i !== index);
        setClothingItems(updatedItems);
    }

    const generateHash = (string) => {
        const seed = 0;
        const hash = murmur.murmur3(string, seed); // or use murmur.murmur2 for murmur2 hash
        return hash;
    }

    const displayImageOnPreview = (item) => {
        console.log('previewCanvasRef: ', previewCanvasRef.current)
        if (previewCanvasRef.current) {
            previewCanvasRef.current.clear(); // Clear the canvas before adding the new image
            previewCanvasRef.current.setBackground(item.url, previewCanvasRef.current);
        }
    }

    const postGenerationRequest = async () => {
        // the outputs of segment are bg_mask, fg_ask, and request_id

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
        // let paths2 = [];

        workspaceCanvas.getObjects().forEach(function(object) {
            if ("path" in object) {
                paths.push(object.toSVG());
            } else {
                urls.push(object._element.currentSrc);
                coords.push(object.lineCoords);
            }
        });
   
        paths.push("NONE"); // to prevent index OOB
        
        let data = null;
        data = {
            bg_cloth_id: bg_cloth_id,
            fg_cloth_id: fg_cloth_id,
            request_id: cur_request_id,
            segment_type: 'partial',
            bg_path: paths[0],
            fg_path: "NONE"
        }

        console.log("data", data);
        
        try {
            const response = await client.post("/generate", data);
            setOutputImg(`data:image/jpeg;base64,${response.data.image}`);
            console.log("got a generation from AnyDoor: ", response.data);
            setOutputImgPresent(true);
            setWaitingID(response.data.id);
        } catch (err) {
            console.error("Error posting data:", err);
            throw err;
        }
    }

    const postSegmentRequest = async (fg_item) => {
        const client = axios.create({
            baseURL: backendURL + "/api",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": backendURL
            }
        });

        let bg_url = workspaceCanvas.backgroundImage._element.src;
        //console.log("bg_url: ", bg_url);

        let data = {
            bg_image_url: bg_url,
            fg_image_url: fg_item.url,
            bg_cloth_id: generateHash( bg_url +  fg_item.type),
            fg_cloth_id: fg_item.fg_cloth_id,
            cloth_type: fg_item.type,
        }

        console.log("data: ", data);

        var bg_mask = null;
        // make the request to /segment
        try {
            const response = await client.post("/segment", data);
            console.log("got a response!", response.data);
            setCurRequestID(response.data.request_id);
            bg_mask = response.data.bg_mask;
            //fg_mask = response.data.fg_mask; // this is actually irrelevant for us unless we display it on the preview

            setBgClothID(data.bg_cloth_id);
            setFgClothID(data.fg_cloth_id);
            setCurrSegmentType(data.cloth_type)
        } catch (err) {
            console.error("Error with segmentation API call:", err);
            throw err;
        }

        // display the returned bg_mask to the user
        // console.log("fg mask url: ", bg_mask_url);
        // bg_mask_url is base64 encoded here
        displayMask(bg_mask);
        // fabric.Image.fromURL(bg_mask_url, function(img) {
        //     workspaceCanvas.add(img);
        //     workspaceCanvas.renderAll();
        // }, {
        //   opacity: 0.40
        // });

        // allow the user to mark up the mask

        
    };

    const displayMask = (mask) => {
        console.log('displaying mask')
        let mask_url = `data:image/jpeg;base64,${mask}`;
        fabric.Image.fromURL(mask_url, function(img) {
            const scalingFactor = workspaceCanvas.height / img.height;


            img.scale(scalingFactor);
            console.log(img.width, img.height);
            console.log(workspaceCanvas.width, workspaceCanvas.height);

            
            const left = (workspaceCanvas.width - (img.width * scalingFactor)) / 2;
            const top = (workspaceCanvas.height - (img.height * scalingFactor)) / 2;

            img.set({
                opacity: 0.4,
                left: left,
                top: top, 
                originX: 'left',
                originY: 'top'
            });

            workspaceCanvas.add(img);
            workspaceCanvas.renderAll();
        });

        // {
        //     opacity: 0.4,
        //     left: left,
        //     top: top,
        //     originX: 'left',
        //     originY: 'top'
        // }
        workspaceCanvas.isDrawingMode = true;
        workspaceCanvas.freeDrawingBrush.width = 20;
        workspaceCanvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        // TODO: relook at this
        // props.updateCanvas(localCanvas);
    }

    return (
        <Container className="App">
          <Typography variant="h4" gutterBottom>Gaussian Closet</Typography>
          <Grid container spacing={3} style={{ height: '100vh' }}>
            <Grid item xs={12} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Workspace updateCanvas={updateWorkspaceCanvas} postGenerationRequest={postGenerationRequest} />
            </Grid>
    
            <Grid item xs={12} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <PreviewWorkspace ref={previewCanvasRef} updateCanvas={updatePreviewCanvas} stageClothingItem={stageClothingItem} />
            </Grid>
    
            <Grid item xs={12} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box className="scrollable-column">
                <Library
                  clothingItems={clothingItems}
                  addClothingItem={addClothingItem}
                  removeClothingItem={removeClothingItem}
                  sendCardContent={postSegmentRequest}
                  displayImageOnPreview={displayImageOnPreview}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      );
}

export default App;
