import React, { useState } from 'react';
import './App.css';
import '../node_modules/react-mask-editor/dist/style.css';
import SegmentCanvas from './components/SegmentCanvas.js';
import Library from './components/Library.js';
import Workspace from './components/Workspace.js';
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

    const [clothingItems, setClothingItems] = useState([]);
    const [workspaceCanvas, setWorkspaceCanvas] = useState('');

    const updateWorkspaceCanvas = (input) => {
        setWorkspaceCanvas(input);
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

    const postAutoSegmentRequest = async () => {
        const client = axios.create({
            baseURL: backendURL + "/api",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": backendURL
            }
        });

        let data = {
            segment_type: 'auto',
            segment_target: segmentTarget,
            bg_image_url: cBg.backgroundImage._element.src,
            fg_image_url: cFg.backgroundImage._element.src,
        }

        console.log(data)

        try {
            const response = await client.post("/segment", data);
            // overlay the masks on the canvases for user feedback
            console.log("got a response!", response.data);
            let bg_mask = response.data.bg_mask;
            let fg_mask = response.data.fg_mask;

            // bg_mask = bg_mask.blob();
            // let bg_mask_url = URL.createObjectURL(bg_mask);
            // console.log("bg mask url: ", bg_mask_url);
            // fabric.Image.fromURL(bg_mask_url, function(img) {
            //     cBg.add(img);
            //     cBg.renderAll();
            // });

            // fg_mask = fg_mask.blob();
            // let fg_mask_url = URL.createObjectURL(fg_mask);
            // console.log("fg mask url: ", fg_mask_url);
            // fabric.Image.fromURL(fg_mask_url, function(img) {
            //     cFg.add(img);
            //     cFg.renderAll();
            // });

            setMaskBg(bg_mask);
            setMaskFg(fg_mask);
            setMaskID('placeholder');

            // TODO:
            // - make the masks translucent to see the image underneath
            // - allow the user to markup the image as usual (optional), we send this to the main endpoint
            // with the autogenerated masks
            // - on the backend (main endpoint), we turn the user SVG into it's own mask, and union it with the autogenerated mask
            // - this doesn't fix *removing* parts of the mask. This is out of scope for now
        } catch (err) {
            console.error("Error with segmentation API call:", err);
            throw err;
        }
    }

    

    const postDataFull = async () => {
        console.log(cBg);
        console.log(cFg);
        if (typeof cBg == "undefined" || typeof cFg == "undefined") {
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

        cBg.getObjects().forEach(function(object) {
            if ("path" in object) {
                paths1.push(object.toSVG());
            } else {
                urls.push(object._element.currentSrc);
                coords.push(object.lineCoords);
            }
        });

        cFg.getObjects().forEach(function(object) {
            if ("path" in object) {
                paths2.push(object.toSVG());
            } else {
                urls.push(object._element.currentSrc);
                coords.push(object.lineCoords);
            }
        });

      paths1.push("NONE");
      paths2.push("NONE");

        let data = null;

        if (segmentTarget != '') {
            if (maskID != '') {
          console.log('partial')
          data = {
            segment_type: 'partial',
            segment_target: segmentTarget,
            bg_image_url: cBg.backgroundImage._element.src,
            fg_image_url: cFg.backgroundImage._element.src,
            bg_path: paths1[0],
            fg_path: paths2[0]
          }
        } else {
          data = {
                  segment_type: 'auto',
                  segment_target: segmentTarget,
                  bg_image_url: cBg.backgroundImage._element.src,
                  fg_image_url: cFg.backgroundImage._element.src,
              }
        }
        } else {
            data = {
                segment_type: 'user',
                bg_image_url: cBg.backgroundImage._element.src,
                fg_image_url: cFg.backgroundImage._element.src,
                bg_path: paths1[0],
                fg_path: paths2[0]
            }
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

    return (
        <Container>
            <Typography variant="h4" gutterBottom>The only buttons you'll ever need</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField 
                            label="Backend URL" 
                            variant="outlined" 
                            fullWidth 
                            value={backendURL} 
                            onChange={e => setBackendURL(e.target.value)} 
                        />
                        <Button variant="contained" color="primary" onClick={() => postDataFull()}>
                            Post Data
                        </Button>
                        <Button variant="contained" color="secondary" onClick={() => getPositions()}>
                            Get All Positions
                        </Button>
                        <TextField 
                            label="Segment Target" 
                            variant="outlined" 
                            fullWidth 
                            value={segmentTarget} 
                            onChange={e => setSegmentTarget(e.target.value)} 
                        />
          <button onClick={() => postAutoSegmentRequest()}>Get Segments</button>
                        {outputImgPresent && (
                            <Paper elevation={3}>
                                <img src={outputImg} alt="Output" style={{ width: '100%' }} />
                            </Paper>
                        )}
                        <Workspace updateCanvas={updateWorkspaceCanvas}/>
                        <SegmentCanvas cid={"bg"} updateCanvas={updatecBg} mask={maskBg} />
                        <SegmentCanvas cid={"fg"} updateCanvas={updatecFg} mask={maskFg} />
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Box className="scrollable-column">
                        <Library clothingItems={clothingItems} addClothingItem={addClothingItem} removeClothingItem={removeClothingItem} />
                    </Box>
                </Grid>
            </Grid>
        </Container>
    );
}

export default App;
