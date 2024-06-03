import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Container, TextField, Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

const PreviewWorkspace = forwardRef((props, ref) => {
    const [open, setOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState(null);
    const [clothingType, setClothingType] = useState('');
    const [description, setDescription] = useState('');
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
            const scalingFactor = canvasRef.current.height / img.height;

            img.scale(scalingFactor);

            const left = (canvasRef.current.width - (img.width * scalingFactor)) / 2;
            const top = (canvasRef.current.height - (img.height * scalingFactor)) / 2;
            img.set({
                opacity: 0.4,
                left: left,
                top: top, 
                originX: 'left',
                originY: 'top'
            });

            canvasRef.current.add(img);
            canvasRef.current.renderAll();
        });

        canvasRef.current.isDrawingMode = true;
        canvasRef.current.freeDrawingBrush.width = 20;
        canvasRef.current.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
    }


    const setBackground = (url, canvas) => {
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
    }

    useImperativeHandle(ref, () => ({
        setBackground: (url) => {
            setBackground(url, canvasRef.current);
        },
        clear: () => {
            canvasRef.current.setBackgroundImage(null, canvasRef.current.renderAll.bind(canvasRef.current));
            canvasRef.current.renderAll();
        },
        displayMask: (mask) => {
            displayMask(mask);
        }
    }));

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
        setImageUrl('');
    };

    const handleUrlChange = (event) => {
        setImageUrl(event.target.value);
        setFile(null);
    };

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const stageItem = () => {
        if (imageUrl || file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageData = file ? reader.result : imageUrl;

                // update the canvas with the new image
                setBackground(imageData, canvasRef.current);

                props.postSegmentRequest({
                    fg_cloth_id: uuidv4(),
                    url: imageData,
                    type: clothingType,
                    description: description || clothingType,
                });

                setImageUrl('');
                setFile(null);
                setClothingType('');
                setDescription('');
                setOpen(false);
            };
            if (file) {
                reader.readAsDataURL(file);
            } else {
                reader.onloadend();
            }
        }
    };

    return (
        <Container>
            <Typography variant="h5" gutterBottom>Workspace</Typography>
            <Box display="flex" justifyContent="center" alignItems="center" mt={2} mb={2}>
                <canvas id="previewCanvas" width="350" height="400" style={{ border: '1px solid #000' }}></canvas>
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
                <Button variant="contained" color="primary" onClick={handleOpen} style={{ marginRight: '8px' }}>Stage Item</Button>
                <Button variant="contained" color="primary" onClick={() => canvasRef.current.clear()} style={{ marginRight: '8px' }}>Clear Stage</Button>
            </Box>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Stage Clothing Item</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Clothing Type"
                        variant="outlined"
                        fullWidth
                        value={clothingType}
                        onChange={e => setClothingType(e.target.value)}
                        margin="dense"
                    />
                    <TextField
                        label="Description"
                        variant="outlined"
                        fullWidth
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        margin="dense"
                    />
                    <Box display="flex" alignItems="center" mt={2}>
                        <TextField
                            label="Enter image URL"
                            variant="outlined"
                            fullWidth
                            value={imageUrl}
                            onChange={handleUrlChange}
                            margin="dense"
                            disabled={!!file}
                        />
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            style={{ marginLeft: '16px' }}
                            disabled={!!imageUrl}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={stageItem} color="primary">
                        Stage Item
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
});

export default PreviewWorkspace;
