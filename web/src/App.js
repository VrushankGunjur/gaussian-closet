import React, { useState, useRef } from 'react';
import './App.css';
import SegmentCanvas from './components/SegmentCanvas.js';
import OutputCanvas from './components/OutputCanvas';
import Library from './components/Library.js';
import Workspace from './components/Workspace.js';
import PreviewWorkspace from './components/PreviewWorkspace.js';
import LoadingScreen from './components/LoadingScreen';
import { Container, Typography, Grid, Box } from '@mui/material';
import axios from 'axios';
import { fabric } from 'fabric';

const App = () => {
    const [waitingID, setWaitingID] = useState('');
    const [backendURL, setBackendURL] = useState('http://34.16.204.56:5000');
    const [outputImg, setOutputImg] = useState('');
    const [outputImgPresent, setOutputImgPresent] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [bg_cloth_id, setBgClothID] = useState('');
    const [fg_cloth_id, setFgClothID] = useState('');
    const [cur_request_id, setCurRequestID] = useState('');
    const [currSegmentType, setCurrSegmentType] = useState('');
    const [clothingItems, setClothingItems] = useState([]);
    const [workspaceCanvas, setWorkspaceCanvas] = useState('');
    const [previewCanvas, setPreviewCanvas] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const previewCanvasRef = useRef(null);
    const workspaceRef = useRef(null);
    const outputCanvasRef = useRef(null);

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

    const addClothingItems = (items) => {
        setClothingItems([...clothingItems, ...items]);
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
        if (previewCanvasRef.current) {
            previewCanvasRef.current.clear(); // Clear the canvas before adding the new image
            previewCanvasRef.current.setBackground(item.url, previewCanvasRef.current);
        }
    }

    const postGenerationRequest = async () => {
        // set the loading screen
        setLoading(true);
        setLoadingMessage('Generating output image...');

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

        workspaceCanvas.getObjects().forEach(function(object) {
            if ("path" in object) {
                paths.push(object.toSVG());
            } else {
                urls.push(object._element.currentSrc);
                coords.push(object.lineCoords);
            }
        });

        paths.push("NONE"); // to prevent index OOB
        
        let data = {
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
            setOutputImgPresent(true);
            setWaitingID(response.data.id);

            if (outputCanvasRef.current) {
                outputCanvasRef.current.setOutputImage(`data:image/jpeg;base64,${response.data.image}`);
            }
            
        } catch (err) {
            console.error("Error posting data:", err);
            throw err;
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    }

    const postSegmentRequest = async (fg_item) => {
        setLoading(true);
        setLoadingMessage('Segmenting Clothing Item Masks...');
        const client = axios.create({
            baseURL: backendURL + "/api",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": backendURL
            }
        });

        let bg_url = workspaceCanvas.backgroundImage._element.src;
        
        let data = {
            bg_image_url: bg_url,
            fg_image_url: fg_item.url,
            bg_cloth_id: generateHash(bg_url + fg_item.type),
            fg_cloth_id: fg_item.fg_cloth_id,
            cloth_type: fg_item.type,
        }

        try {
            const response = await client.post("/segment", data);
            setCurRequestID(response.data.request_id);
            displayBgMask(response.data.bg_mask);
            // displayFgMask(response.data.fg_mask);
            
            // Pass the mask data to the PreviewWorkspace component
            if (previewCanvasRef.current) {
                previewCanvasRef.current.displayMask(response.data.fg_mask);
            }
            
            setBgClothID(data.bg_cloth_id);
            setFgClothID(data.fg_cloth_id);
            setCurrSegmentType(data.cloth_type);
        } catch (err) {
            console.error("Error with segmentation API call:", err);
            setError('Error with segmentation API call');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    }

    const displayBgMask = (mask) => {
        let mask_url = `data:image/jpeg;base64,${mask}`;
        fabric.Image.fromURL(mask_url, function(img) {
            const scalingFactor = workspaceCanvas.height / img.height;

            img.scale(scalingFactor);

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

        workspaceCanvas.isDrawingMode = true;
        workspaceCanvas.freeDrawingBrush.width = 20;
        workspaceCanvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
    }

    const setWorkspaceBackground = (url) => {
        // console.log(workspaceRef)
        // workspaceRef.current.setBackground(url);
        if (workspaceRef.current) {
            workspaceRef.current.setBackground(url);
            // workspaceRef.current = url;
        }
    };

    return (
        <Container className="App" style={{ fontFamily: 'Arial, sans-serif' }}>
             {loading && <LoadingScreen message={loadingMessage} />}
            <Typography variant="h2" gutterBottom style={{ textAlign: 'center', paddingTop: 14 }}>Gaussian Closet</Typography>
            <Typography variant="h4" gutterBottom style={{ textAlign: 'center', paddingBottom: 25 }}>By Nahum, Vrushank, and Alex</Typography>

            <Grid container spacing={2} style={{ height: '100vh', width: '84vw', paddingRight: 200}}>
                <Grid item xs={'auto'} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '18px'}}>
                    <Workspace ref={workspaceRef} updateCanvas={updateWorkspaceCanvas} postGenerationRequest={postGenerationRequest} />
                </Grid>

                <Grid item xs={'auto'} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <PreviewWorkspace ref={previewCanvasRef} updateCanvas={updatePreviewCanvas} postSegmentRequest={postSegmentRequest} />
                </Grid>

                <Grid item xs={'auto'} md={4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Box className="scrollable-column" style={{ padding: '16px', backgroundColor: '#f7f7f7', borderRadius: '8px', boxShadow: '1 1 10px rgba(0, 0, 0, 0.1)' }}>
                        <Library
                            clothingItems={clothingItems}
                            addClothingItem={addClothingItem}
                            addClothingItems={addClothingItems}
                            removeClothingItem={removeClothingItem}
                            sendCardContent={postSegmentRequest}
                            displayImageOnPreview={displayImageOnPreview}
                        />
                    </Box>
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                <Grid item xs={12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: -500, paddingLeft: -40 }}>
                    <OutputCanvas ref={outputCanvasRef} setBackground={setWorkspaceBackground} updateCanvas={updateWorkspaceCanvas} />
                </Grid>
            </Grid>
            {error && <Typography variant="h6" style={{ color: 'red', textAlign: 'center' }}>{error}</Typography>}
        </Container>
    );
}

export default App;
