// components/Library.js
import React, { useState } from 'react';

const Library = ({ clothingItems, addClothingItem }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState(null);

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const handleAddByUrl = () => {
        if (imageUrl) {
            addClothingItem({ url: imageUrl });
            setImageUrl('');
        }
    };

    const handleAddByFile = () => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                addClothingItem({ url: reader.result });
                setFile(null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="library">
            <h2>Clothing Library</h2>
            <div>
                <input 
                    type="text" 
                    placeholder="Enter image URL" 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)} 
                />
                <button onClick={handleAddByUrl}>Add by URL</button>
            </div>
            <div>
                <input 
                    type="file" 
                    onChange={handleFileUpload} 
                />
                <button onClick={handleAddByFile}>Add by File</button>
            </div>
            <div className="clothing-items">
                {clothingItems.map((item, index) => (
                    <img key={index} src={item.url} alt={`Clothing item ${index}`} />
                ))}
            </div>
        </div>
    );
};

export default Library;
