import cv2
import torch
import requests
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from transformers import AutoModelForMaskGeneration, AutoProcessor, pipeline

from dataclasses import dataclass
from typing import Any, List, Dict, Optional, Union, Tuple

from skimage.draw import polygon2mask

@dataclass
class BoundingBox:
    xmin: int
    ymin: int
    xmax: int
    ymax: int

    @property
    def xyxy(self) -> List[float]:
        return [self.xmin, self.ymin, self.xmax, self.ymax]

@dataclass
class DetectionResult:
    score: float
    label: str
    box: BoundingBox
    mask: Optional[np.array] = None

    @classmethod
    def from_dict(cls, detection_dict: Dict) -> 'DetectionResult':
        return cls(score=detection_dict['score'],
                   label=detection_dict['label'],
                   box=BoundingBox(xmin=detection_dict['box']['xmin'],
                                   ymin=detection_dict['box']['ymin'],
                                   xmax=detection_dict['box']['xmax'],
                                   ymax=detection_dict['box']['ymax']))
     

class AutoSegmenter():
    def __init__(self, 
                 detector_id="IDEA-Research/grounding-dino-tiny",
                 segmenter_id="facebook/sam-vit-base",
                 threshold=0.3):
        self.threshold = threshold
        self.detector_id = detector_id
        self.segmenter_id = segmenter_id

    def run_segmenter_single(self,
                             img: Union[Image.Image, str], 
                             labels: List[str],
                             polygon_refinement=True):
        image_array, detections = self.grounded_segmentation(
            image=img,
            labels=labels,
            threshold=self.threshold,
            polygon_refinement=polygon_refinement,
            detector_id=self.detector_id,
            segmenter_id=self.segmenter_id
        )

        masks = self.create_mask(image_array, detections)
        return masks

    def run_segmenter(self, 
                      background: Union[Image.Image, str], 
                      foreground: Union[Image.Image, str], 
                      labels: List[str],
                      polygon_refinement=True):
        bg_image_array, bg_detections = self.grounded_segmentation(
            image=background,
            labels=labels,
            threshold=self.threshold,
            polygon_refinement=polygon_refinement,
            detector_id=self.detector_id,
            segmenter_id=self.segmenter_id
        )

        bg_masks = self.create_mask(bg_image_array, bg_detections) 

        fg_image_array, fg_detections = self.grounded_segmentation(
            image=foreground,
            labels=labels,
            threshold=self.threshold,
            polygon_refinement=polygon_refinement,
            detector_id=self.detector_id,
            segmenter_id=self.segmenter_id
        )

        fg_masks = self.create_mask(fg_image_array, fg_detections)

        return bg_masks, fg_masks


    def mask_to_polygon(self, mask: np.ndarray) -> List[List[int]]:
        # Find contours in the binary mask
        contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Find the contour with the largest area
        largest_contour = max(contours, key=cv2.contourArea)

        # Extract the vertices of the contour
        polygon = largest_contour.reshape(-1, 2).tolist()

        return polygon

    def polygon_to_mask(self, polygon: List[Tuple[int, int]], image_shape: Tuple[int, int]) -> np.ndarray:
        """
        Convert a polygon to a segmentation mask.

        Args:
        - polygon (list): List of (x, y) coordinates representing the vertices of the polygon.
        - image_shape (tuple): Shape of the image (height, width) for the mask.

        Returns:
        - np.ndarray: Segmentation mask with the polygon filled.
        """
        # Create an empty mask
        mask = np.zeros(image_shape, dtype=np.uint8)

        # Convert polygon to an array of points
        pts = np.array(polygon, dtype=np.int32)

        # Fill the polygon with white color (255)
        cv2.fillPoly(mask, [pts], color=(255,))

        return mask

    def load_image(self, image_str: str) -> Image.Image:
        if image_str.startswith("http"):
            image = Image.open(requests.get(image_str, stream=True).raw).convert("RGB")
        else:
            image = Image.open(image_str).convert("RGB")

        return image

    def get_boxes(self, results: DetectionResult) -> List[List[List[float]]]:
        boxes = []
        for result in results:
            xyxy = result.box.xyxy
            boxes.append(xyxy)

        return [boxes]

    def refine_masks(self, masks: torch.BoolTensor, polygon_refinement: bool = False) -> List[np.ndarray]:
        masks = masks.cpu().float()
        masks = masks.permute(0, 2, 3, 1)
        masks = masks.mean(axis=-1)
        masks = (masks > 0).int()
        masks = masks.numpy().astype(np.uint8)
        masks = list(masks)

        if polygon_refinement:
            for idx, mask in enumerate(masks):
                shape = mask.shape
                polygon = self.mask_to_polygon(mask)
                mask = self.polygon_to_mask(polygon, shape)
                masks[idx] = mask

        return masks

    def detect(
        self,
        image: Image.Image,
        labels: List[str],
        threshold: float = 0.3,
        detector_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Use Grounding DINO to detect a set of labels in an image in a zero-shot fashion.
        """
        device = "cuda" if torch.cuda.is_available() else "cpu"
        detector_id = detector_id if detector_id is not None else "IDEA-Research/grounding-dino-tiny"
        object_detector = pipeline(model=detector_id, task="zero-shot-object-detection", device=device)

        labels = [label if label.endswith(".") else label+"." for label in labels]

        results = object_detector(image,  candidate_labels=labels, threshold=threshold)
        results = [DetectionResult.from_dict(result) for result in results]

        return results

    def segment(
        self,
        image: Image.Image,
        detection_results: List[Dict[str, Any]],
        polygon_refinement: bool = False,
        segmenter_id: Optional[str] = None
    ) -> List[DetectionResult]:
        """
        Use Segment Anything (SAM) to generate masks given an image + a set of bounding boxes.
        """
        device = "cuda" if torch.cuda.is_available() else "cpu"
        segmenter_id = segmenter_id if segmenter_id is not None else "facebook/sam-vit-base"

        segmentator = AutoModelForMaskGeneration.from_pretrained(segmenter_id).to(device)
        processor = AutoProcessor.from_pretrained(segmenter_id)

        boxes = self.get_boxes(detection_results)
        inputs = processor(images=image, input_boxes=boxes, return_tensors="pt").to(device)

        outputs = segmentator(**inputs)
        masks = processor.post_process_masks(
            masks=outputs.pred_masks,
            original_sizes=inputs.original_sizes,
            reshaped_input_sizes=inputs.reshaped_input_sizes
        )[0]

        masks = self.refine_masks(masks, polygon_refinement)

        for detection_result, mask in zip(detection_results, masks):
            detection_result.mask = mask

        return detection_results

    def grounded_segmentation(
        self,
        image: Union[Image.Image, str],
        labels: List[str],
        threshold: float = 0.3,
        polygon_refinement: bool = False,
        detector_id: Optional[str] = None,
        segmenter_id: Optional[str] = None,
    ) -> Tuple[np.ndarray, List[DetectionResult]]:
        if isinstance(image, str):
            image = self.load_image(image)

        detections = self.detect(image, labels, threshold, detector_id)
        detections = self.segment(image, detections, polygon_refinement, segmenter_id)

        return np.array(image), detections

    def create_mask(self, image_array, detections):

        masks = []
        for i, detection in enumerate(detections):
            mask = detection.mask
            # save the binary mask to a file 
            polygon = self.mask_to_polygon(mask)
            # invert y and x coords in polygon
            polygon = [(y, x) for x, y in polygon]
            b_shape = (image_array.shape[0], image_array.shape[1])
            bin_mask = polygon2mask(b_shape, polygon).astype(np.uint8) 
            img = Image.fromarray(bin_mask*255)

            # instead of saving to a file, we want to return the images -- 
            # also want to sort by confidence and only take the first result usually.
            img.save(f"{detection.label}-{i}.png")

            #og_img = Image.fromarray(image_array)
            #og_img.save(f"og_img.png")
            masks.append((bin_mask, detection.label))
        
        # returns [(mask1, mask1label), (mask2, mask2label),..., (maskn, masknlabel)]
        return masks

# def main():

#     #image_url = "http://images.cocodataset.org/val2017/000000039769.jpg"
#     image = Image.open("./background.png")
#     #labels = ["a cat.", "a remote control."]
#     labels = ["a pair of shoes"]
#     threshold = 0.3

#     detector_id = "IDEA-Research/grounding-dino-tiny"
#     segmenter_id = "facebook/sam-vit-base"


#     image_array, detections = grounded_segmentation(
#         image=image,
#         labels=labels,
#         threshold=threshold,
#         polygon_refinement=True,
#         detector_id=detector_id,
#         segmenter_id=segmenter_id
#     )

#     create_mask(image_array, detections)

# if __name__ == "__main__":
#     main()
