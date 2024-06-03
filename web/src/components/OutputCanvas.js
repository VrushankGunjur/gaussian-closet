import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Container, Button, Box, Typography } from '@mui/material';
import { fabric } from 'fabric';

const OutputCanvas = forwardRef((props, ref) => {
    const [outputImage, setOutputImage] = useState('');
    const canvasRef = useRef(null);

    useImperativeHandle(ref, () => ({
        setOutputImage: (image) => {
            setOutputImage(image);
            const canvas = canvasRef.current;

            fabric.Image.fromURL(image, function(img) {
                img.scale(scalingFactor);
                const left = (canvas.width - (img.width * scalingFactor)) / 2;
                const top = (canvas.height - (img.height * scalingFactor)) / 2;

                canvas.clear();
                // TODO: this won't work for images that are too wide
                const scalingFactor = canvas.height / img.height;
                img.scale(scalingFactor);
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    left: left,
                    top: top,
                    originX: 'left',
                    originY: 'top'
                });
            });

            canvas.renderAll();
            if (props.updateCanvas) {
                props.updateCanvas(canvas);
            }
        },
        clearCanvas: () => {
            const canvas = canvasRef.current;
            canvas.clear();
            canvas.renderAll();
        }
    }));

    const handleAddToBackground = () => {
        if (outputImage && props.setBackground) {
            props.setBackground(outputImage);
        }
    };

    const handleClearCanvas = () => {
        if (ref.current) {
            ref.current.clearCanvas();
        }
    };

    useEffect(() => {
        const canvas = new fabric.Canvas('outputCanvas', {
            height: 400,
            width: 400,
        });
        canvasRef.current = canvas;
        return () => {
            canvas.dispose();
        };
    }, []);

    return (
        <Container>
            <Typography variant="h5" gutterBottom>Output Canvas</Typography>
            <Box display="flex" justifyContent="center" alignItems="center" mt={2} mb={2}>
                <canvas id="outputCanvas" width="350" height="400" style={{ border: '1px solid #000' }}></canvas>
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
                <Button variant="contained" color="primary" onClick={handleAddToBackground}>Add to Background</Button>
                <Button variant="contained" color="error" onClick={handleClearCanvas} style={{ marginLeft: '10px' }}>Clear Canvas</Button>
            </Box>
        </Container>
    );
});

export default OutputCanvas;
