import React, { useState } from 'react';
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
    const [backendURL, setBackendURL] = useState('http://34.47.24.64:5000');
    const [outputImg, setOutputImg] = useState('');
    const [outputImgPresent, setOutputImgPresent] = useState(false);
    const [segmentTarget, setSegmentTarget] = useState('');
    const [cBg, setCBg] = useState('');
    const [cFg, setCFg] = useState('');
    const [maskBg, setMaskBg] = useState('');
    const [maskFg, setMaskFg] = useState('');
    const [maskID, setMaskID] = useState('');

    // info passed from /segment to /generate that we need to hold on to in the meantime
    const [bg_cloth_id, setBgClothID] = useState('');
    const [fg_cloth_id, setFgClothID] = useState('');
    const [cur_request_id, setCurRequestID] = useState('');
    const [currSegmentType, setCurrSegmentType] = useState('');

    const [clothingItems, setClothingItems] = useState([]);
    const [workspaceCanvas, setWorkspaceCanvas] = useState('');
    const [previewCanvas, setPreviewCanvas] = useState('');

    const murmur = require('murmurhash-js');

    const updateWorkspaceCanvas = (input) => {
        setWorkspaceCanvas(input);
    }

    const updatePreviewCanvas = (input) => {
        setPreviewCanvas(input);
    }



    const updatecBg = (input) => {
        setCBg(input);
    }

    const updatecFg = (input) => {
        setCFg(input);
    }

    const addClothingItem = (item) => {
        setClothingItems([...clothingItems, item]);
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

    const postGenerationRequest = async (string) => {
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
        
        console.log(fg_item);

        let bg_url = workspaceCanvas.backgroundImage._element.src;
        console.log("bg_url: ", bg_url);

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
        let mask_url = `data:image/jpeg;base64,${mask}`;
        fabric.Image.fromURL(mask, function(img) {
            workspaceCanvas.add(img);
            workspaceCanvas.renderAll();
        }, {
            opacity: 0.4
        });

        workspaceCanvas.isDrawingMode = true;
        workspaceCanvas.freeDrawingBrush.width = 20;
        workspaceCanvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        // TODO: relook at this
        // props.updateCanvas(localCanvas);
    }

    const getPositions = () => {
        if (typeof cBg !== "undefined") {
            console.log(cBg);
            console.log("cBg Size: ", cBg.width, cBg.height);

            cBg.getObjects().forEach(function(object) {
                // Object is bounding line
                if ("path" in object) {
                    object.fill = 'red';
                    console.log(object)
                    console.log(object.toClipPathSVG())
                    console.log(object.toSVG())
                    console.log(object.toDatalessObject())
                } else {
                    // Object is a foreground image
                    console.log("Image URL: ", object._element.currentSrc);
                    console.log("Coords: ", object.lineCoords);
                }
            });
        }

        if (typeof cFg !== "undefined") {
            console.log(cFg);
            console.log("cFg Size: ", cFg.width, cFg.height);

            cFg.getObjects().forEach(function(object) {
                // Object is bounding line
                if ("path" in object) {
                    object.fill = 'red';
                    console.log(object)
                    console.log(object.toClipPathSVG())
                    console.log(object.toSVG())
                    console.log(object.toDatalessObject())
                } else {
                    // Object is a foreground image
                    console.log("Image URL: ", object._element.currentSrc);
                    console.log("Coords: ", object.lineCoords);
                }
            });
        }
    }

    // const postAutoSegmentRequest = async () => {
    //     const client = axios.create({
    //         baseURL: backendURL + "/api",
    //         headers: {
    //             "Content-Type": "application/json",
    //             "Access-Control-Allow-Origin": backendURL
    //         }
    //     });

    //     let data = {
    //         segment_type: 'auto',
    //         segment_target: segmentTarget,
    //         bg_image_url: cBg.backgroundImage._element.src,
    //         fg_image_url: cFg.backgroundImage._element.src,
    //     }

    //     console.log(data)

    //     try {
    //         const response = await client.post("/segment", data);
    //         // overlay the masks on the canvases for user feedback
    //         console.log("got a response!", response.data);
    //         let bg_mask = response.data.bg_mask;
    //         let fg_mask = response.data.fg_mask;

    //         // bg_mask = bg_mask.blob();
    //         // let bg_mask_url = URL.createObjectURL(bg_mask);
    //         // console.log("bg mask url: ", bg_mask_url);
    //         // fabric.Image.fromURL(bg_mask_url, function(img) {
    //         //     cBg.add(img);
    //         //     cBg.renderAll();
    //         // });

    //         // fg_mask = fg_mask.blob();
    //         // let fg_mask_url = URL.createObjectURL(fg_mask);
    //         // console.log("fg mask url: ", fg_mask_url);
    //         // fabric.Image.fromURL(fg_mask_url, function(img) {
    //         //     cFg.add(img);
    //         //     cFg.renderAll();
    //         // });

    //         setMaskBg(bg_mask);
    //         setMaskFg(fg_mask);
    //         setMaskID('placeholder');

    //         // TODO:
    //         // - make the masks translucent to see the image underneath
    //         // - allow the user to markup the image as usual (optional), we send this to the main endpoint
    //         // with the autogenerated masks
    //         // - on the backend (main endpoint), we turn the user SVG into it's own mask, and union it with the autogenerated mask
    //         // - this doesn't fix *removing* parts of the mask. This is out of scope for now
    //     } catch (err) {
    //         console.error("Error with segmentation API call:", err);
    //         throw err;
    //     }
    // }

    

    // const postDataFull = async () => {
    //     console.log(cBg);
    //     console.log(cFg);
    //     if (typeof cBg == "undefined" || typeof cFg == "undefined") {
    //         return;
    //     }

    //     console.log("Sending post request to backend");
    //     const client = axios.create({
    //         baseURL: backendURL + "/api",
    //         headers: {
    //             "Content-Type": "application/json",
    //             "Access-Control-Allow-Origin": backendURL
    //         }
    //     });

    //     let urls = [];
    //     let coords = [];
    //     let paths1 = [];
    //     let paths2 = [];

    //     cBg.getObjects().forEach(function(object) {
    //         if ("path" in object) {
    //             paths1.push(object.toSVG());
    //         } else {
    //             urls.push(object._element.currentSrc);
    //             coords.push(object.lineCoords);
    //         }
    //     });

    //     cFg.getObjects().forEach(function(object) {
    //         if ("path" in object) {
    //             paths2.push(object.toSVG());
    //         } else {
    //             urls.push(object._element.currentSrc);
    //             coords.push(object.lineCoords);
    //         }
    //     });

    //   paths1.push("NONE");
    //   paths2.push("NONE");

    //     let data = null;

        // if (segmentTarget != '') {
        //     if (maskID != '') {
        //   console.log('partial')
        //   data = {
        //     segment_type: 'partial',
        //     segment_target: segmentTarget,
        //     bg_image_url: cBg.backgroundImage._element.src,
        //     fg_image_url: cFg.backgroundImage._element.src,
        //     bg_path: paths1[0],
        //     fg_path: paths2[0]
        //   }
        // } else {
        //   data = {
        //           segment_type: 'auto',
        //           segment_target: segmentTarget,
        //           bg_image_url: cBg.backgroundImage._element.src,
        //           fg_image_url: cFg.backgroundImage._element.src,
        //       }
        // }
        // } else {
        //     data = {
        //         segment_type: 'user',
        //         bg_image_url: cBg.backgroundImage._element.src,
        //         fg_image_url: cFg.backgroundImage._element.src,
        //         bg_path: paths1[0],
        //         fg_path: paths2[0]
        //     }
        // }

    //     console.log(data)

    //     try {
    //         const response = await client.post("/in_fill", data);
    //         setOutputImg(`data:image/jpeg;base64,${response.data.image}`);
    //         console.log("got a response!", response.data);
    //         setOutputImgPresent(true);
    //         setWaitingID(response.data.id);
    //     } catch (err) {
    //         console.error("Error posting data:", err);
    //         throw err;
    //     }
    // }

    return (
      <Container className="App">
          <Typography variant="h4" gutterBottom>Gaussian Closet</Typography>
          <Grid container spacing={3} style={{ height: '100vh' }}>
              <Grid item xs={10} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <TextField 
                      label="Backend URL" 
                      variant="outlined" 
                      fullWidth 
                      value={backendURL} 
                      onChange={e => setBackendURL(e.target.value)} 
                  />
                  <Button variant="contained" color="primary" /*onClick={postDataFull}*/>
                      Post Data
                  </Button>
                  <Button variant="contained" color="secondary" onClick={getPositions}>
                      Get All Positions
                  </Button>
                  <TextField 
                      label="Segment Target" 
                      variant="outlined" 
                      fullWidth 
                      value={segmentTarget} 
                      onChange={e => setSegmentTarget(e.target.value)} 
                  />
                  <Button /*onClick={postAutoSegmentRequest}*/>Get Segments</Button>
                  {outputImgPresent && (
                      <Paper elevation={3}>
                          <img src={outputImg} alt="Output" style={{ width: '100%' }} />
                      </Paper>
                  )}
                  <Workspace updateCanvas={updateWorkspaceCanvas}/>
              </Grid>

              <Grid item xs={8} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <PreviewWorkspace updateCanvas={updatePreviewCanvas}/>
              </Grid>

              <Grid item xs={8} md={4}>
                  <Box className="scrollable-column">
                      <Library clothingItems={clothingItems} addClothingItem={addClothingItem} removeClothingItem={removeClothingItem} sendCardContent={postSegmentRequest} />
                  </Box>
              </Grid>
          </Grid>
      </Container>
  );
}

export default App;
