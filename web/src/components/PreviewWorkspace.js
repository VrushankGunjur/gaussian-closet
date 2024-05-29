import React, { useState, useEffect, useRef } from 'react';
import { Container, TextField, Button, Typography, Box, Grid, Paper } from '@mui/material';
import { fabric } from 'fabric';

const Workspace = (props) => {
    const [file, setFile] = useState(null);
    const [imgURL, setImageUrl] = useState('');
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = new fabric.Canvas('previewCanvas', {
            height: 400,
            width: 400,
        });
        canvasRef.current = canvas;
        return () => {
            canvas.dispose();
        };
    }, []);

    const displayMask = (mask) => {
        let mask_url = `data:image/jpeg;base64,${mask}`;
        fabric.Image.fromURL(mask_url, function(img) {
            canvasRef.current.add(img);
            canvasRef.current.renderAll();
        }, {
            opacity: 0.4
        });

        canvasRef.current.isDrawingMode = true;
        canvasRef.current.freeDrawingBrush.width = 20;
        canvasRef.current.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
        props.updateCanvas(canvasRef.current);
    }

    const setBackground = (e, url, canvas) => {
        if (e) e.preventDefault();

        fabric.Image.fromURL(url, function(img) {
            const scalingFactor = canvas.height / img.height;
            img.scale(scalingFactor);

            const left = (canvas.width - (img.width * scalingFactor)) / 2;
            const top = (canvas.height - (img.height * scalingFactor)) / 2;

            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                left: left,
                top: top,
                originX: 'left',
                originY: 'top'
            });
        });

        canvas.renderAll();
        props.updateCanvas(canvas);
    }

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const handleAddByFile = () => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackground(null, reader.result, canvasRef.current);
                setFile(null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Container>
            <Typography variant="h5">Workspace</Typography>
            <canvas id="previewCanvas" width="400" height="400"></canvas>
            <Box mt={2}>
                <Typography variant="body1">Enter URL of an image to the workspace</Typography>
                <form onSubmit={e => setBackground(e, imgURL, canvasRef.current)}>
                    <TextField 
                        type="text" 
                        value={imgURL}
                        onChange={e => setImageUrl(e.target.value)} 
                        fullWidth 
                        margin="normal"
                    />
                    <Button type="submit" variant="contained" color="primary">Submit URL</Button>
                </form>
            </Box>
            <Box mt={2}>
                <Typography variant="body1">Upload an image to the workspace</Typography>
                <TextField 
                    type="file" 
                    onChange={handleFileUpload} 
                    fullWidth 
                />
                <Button variant="contained" color="primary" onClick={handleAddByFile} style={{ marginTop: '8px' }}>
                    Add by File
                </Button>
            </Box>
            <Button variant="contained" color="secondary" style={{ marginTop: '16px' }}>Generate</Button>
        </Container>
    );
}

export default Workspace;
