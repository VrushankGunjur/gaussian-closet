import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = ({ message }) => {
    return (
        <Box 
            display="flex" 
            flexDirection="column" 
            justifyContent="center" 
            alignItems="center" 
            position="fixed" 
            top={0} 
            left={0} 
            right={0} 
            bottom={0} 
            bgcolor="rgba(255, 255, 255, 0.8)" 
            zIndex={1000}
        >
            <CircularProgress />
            <Typography variant="h6" style={{ marginTop: '16px' }}>
                {message}
            </Typography>
        </Box>
    );
}

export default LoadingScreen;
