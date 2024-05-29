import React, { useState, useEffect, useRef } from 'react';
import SegmentCanvas from './SegmentCanvas.js';
import { Container, TextField, Button, Typography, Box, Grid, Paper } from '@mui/material';
import { fabric } from 'fabric';

const Workspace = ( props ) => {
    const [file, setFile] = useState(null);
    const [localCanvas, setLocalCanvas] = useState('');
    const [imgURL, setImageUrl] = useState('');
    useEffect(() => {
        setLocalCanvas(initCanvas());
    }, []);

    const initCanvas = () => (
        new fabric.Canvas('workspace canvas', {
            height: 400,
            width: 650, // @VRUSHANK @NAHUM this should be the widt of the workspace column
            //backgroundImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzb4Jrezq8NF7RRGXpxMR8jAlK2SHZ0uFJFPKaS5oPag&s',
            //backgroundImage: backgroundURL
        })

    )

    const displayMask = (mask) => {
        let mask_url = `data:image/jpeg;base64,${mask}`;
        fabric.Image.fromURL(mask, function(img) {
            localCanvas.add(img);
            localCanvas.renderAll();
        }, {
            opacity: 0.4
        });

        localCanvas.isDrawingMode = true;
        localCanvas.freeDrawingBrush.width = 20;
        localCanvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        props.updateCanvas(localCanvas);
    }

    const setBackground = (e, url, canvi) => {
        if (e) {
            e.preventDefault();
        }

        console.log(url);

        var img = new Image();

        img = fabric.Image.fromURL(url, function(img, isError) {
            //canvi.setWidth(canvi.height * (img.width / img.height));
            console.log(canvi.width, canvi.height);
            // img.scaleToWidth(canvi.width);
            // img.scaleToHeight(canvi.height);
            const scalingFactor = canvi.height / img.height;
            
            img.scale(scalingFactor); 
            console.log(img.width, img.height);
            //img.set({width: canvi.width, height: canvi.height, originX: 'left', originY: 'top'});

            const left = (canvi.width - (img.width * scalingFactor)) / 2;
            const top = (canvi.height - (img.height * scalingFactor)) / 2;

            canvi.setBackgroundImage(img, canvi.renderAll.bind(canvi), {
                left: left,
                top: top,
                originX: 'left',
                originY: 'top'
            });
        });
        
        // console.log(img.width, img.height);
        canvi.renderAll();
        props.updateCanvas(canvi);      // update the canvas in the parent component
    }

    const handleFileUpload = (event) => {
        // console.log(event.target.files[0]);
        setFile(event.target.files[0]);
        // console.log(file);
    };

    const handleAddByFile = () => {
        // console.log(file);
        if (file) {
            console.log('trying to upload file');
            const reader = new FileReader();
            reader.onloadend = () => {
                let clothing_item = { url : reader.result };
                console.log(clothing_item);
                setBackground(null, reader.result, localCanvas);
                //addClothingItem({ url: reader.result });
                setFile(null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <p>Workspace</p>
            <canvas id="workspace canvas" width="800" height="800"></canvas>
            <div >
                <p>Enter URL of an image to the workspace</p>
                <form onSubmit={e => setBackground(e, imgURL, localCanvas)}>
                    <div>
                        <input 
                        type="text" 
                        value={imgURL}
                        onChange={ e => setImageUrl(e.target.value)} 
                        />
                        <button type="submit">Submit URL</button>
                    </div>
                </form>
                <p>Upload an image to the workspace</p>
                <TextField 
                    type="file" 
                    onChange={handleFileUpload} 
                    fullWidth 
                />
                <Button variant="contained" color="primary" onClick={handleAddByFile} style={{ marginTop: '8px' }}>
                    Add by File
                </Button>
            </div>
            <Button>Generate</Button>
        </div>
    );
}

export default Workspace