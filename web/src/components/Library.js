import React, { useEffect, useState } from 'react';
import {
    Box, TextField, Button, Typography, Paper, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, Grid, Card, CardMedia, CardContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from 'uuid';

const Library = ({ clothingItems, addClothingItem, addClothingItems, removeClothingItem, sendCardContent, displayImageOnPreview }) => {
    const [open, setOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState(null);
    const [clothingType, setClothingType] = useState('');
    const [description, setDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Add some clothing to library
        let l = [
            {
                fg_cloth_id: uuidv4(),
                url: 'https://www.mrporter.com/variants/images/1647597292000677/in/w2000_q60.jpg',
                type: 'pants',
                description: 'straght-leg distressed jeans',
            },
            {
                fg_cloth_id: uuidv4(),
                url: 'https://i.ebayimg.com/images/g/tpEAAOSwPQ9la0oV/s-l1200.webp',
                type: 'jacket',
                description: 'field chore jacket',
            },
            {
                fg_cloth_id: uuidv4(),
                url: 'https://ih1.redbubble.net/image.1210051357.6638/ssrco,slim_fit_t_shirt,mens,fafafa:ca443f4786,front,square_product,600x600.jpg',
                type: 'shirt',
                description: 'talking heads t-shirt',
            }
        ]

        addClothingItems(l);

    }, []);

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
        setImageUrl('');
    };

    const handleUrlChange = (event) => {
        setImageUrl(event.target.value);
        setFile(null);
    };

    const handleAddItem = () => {
        if (imageUrl || file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                addClothingItem({
                    fg_cloth_id: uuidv4(),
                    url: file ? reader.result : imageUrl,
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

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSend = (item) => {
        sendCardContent(item);
        displayImageOnPreview(item); // Call the function to display the image
    };

    const filteredItems = clothingItems.filter(item =>
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Clothing Library
            </Typography>
            <TextField
                label="Search by description"
                variant="outlined"
                fullWidth
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginBottom: '8px'}}
            />
            <Button variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: '16px' }}>
                Add Item
            </Button>
            
            {filteredItems.length !== 0 &&
                <Paper style={{ maxHeight: '60vh', overflow: 'auto', padding: '16px' }}>
                <Grid container spacing={4}>
                    {filteredItems.map((item, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    width="180"
                                    image={item.url}
                                    alt={`Clothing item ${index}`}
                                    style={{ objectFit: 'cover' }}
                                />
                                <CardContent style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Typography variant="body2" color="textSecondary" component="p">
                                        {item.description}
                                    </Typography>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <Button variant="contained" color="primary" size="small" onClick={() => handleSend(item)}>
                                            Stage
                                        </Button>
                                        <IconButton edge="end" aria-label="delete" onClick={() => removeClothingItem(index)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
            }
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Add New Clothing Item</DialogTitle>
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
                    <Button onClick={handleAddItem} color="primary">
                        Add Item
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Library;
