# Gaussian Closet: A Robust and Painless Digital Wardrobe

## Overview
Welcome to the Gaussian Closet project, our group's [CS348K](https://gfxcourses.stanford.edu/cs348k/spring24) project. This repository contains the code for a novel web application that allows users to virtually try on a digital wardrobe of clothes. By integrating advanced AI models with traditional image processing techniques, this application provides a seamless and realistic virtual try-on experience.

## Authors
- Vrushank Gunjur, Department of Computer Science, Stanford University
- Nahum Maru, Department of Computer Science, Stanford University
- Alexander Waitz, Department of Computer Science, Stanford University

## Abstract
We introduce a novel web application that enables users to virtually try on a digital wardrobe of clothes for outfit creation and online shopping. This application allows users to virtually try on clothing items from any image, including those found on online shopping websites. Our application focuses on three primary goals: speed, ease-of-use, and high-quality, convincing images. By integrating advanced diffusion-based techniques with traditional image processing methods, we generate realistic images that largely achieve the goals of the system and deliver the desired user experience.

## Key Features
1. **Speed**: Generate images promptly to accommodate the typical user’s shopping experience.
2. **Ease-of-Use**: An intuitive and straightforward interface, enabling users of all levels of expertise to generate high-quality images effortlessly.
3. **High-Quality Images**: Consistently produce realistic and convincing composite images.


## System Workflow
1. **Image Segmentation**: Automatically segment clothing items using the Segment Anything Model (SAM).
2. **Mask Generation and Caching**: Generate and cache masks for efficient processing.
3. **Mask Modification**: Allow users to modify masks to specify the exact fit they desire.
4. **Diffusion Process**: Use the AnyDoor model to generate composite images.
5. **Artifact Removal and Image Stitching**: Employ a stitching process to remove artifacts and blend the output.
6. **Seam Smoothing**: Apply a Gaussian blur filter to smooth out boundaries and blend edges.

## User Interface Design
The UI is designed to be intuitive, allowing users to:
- Upload images of clothing items into a persistent clothing library.
- Stage items into workspaces and modify their masks.
- Visualize different outfit combinations.
- Add shopping links for direct access to online stores.

## Evaluation and Results
Our evaluation focuses on three key questions:
1. **Accuracy**: Does the system provide a realistic depiction of the user in the outfit?
2. **Selective Modification**: Does the system only modify necessary regions of the image?
3. **Speed**: Does the system run quickly enough for real-time applications?

### Performance Metrics
- **Image Accuracy**: Evaluated through qualitative assessments and image similarity metrics (SSIM, MSE, PSNR).
- **Selective Image Modification**: Ensured through image processing techniques and artifact removal.
- **Performance and Speed**: Optimized using caching mechanisms and tested on various GPU configurations.
