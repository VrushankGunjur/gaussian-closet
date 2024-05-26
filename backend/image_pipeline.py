from run_inference import inference_single_image
import numpy as np

class AnyDoorTask:
    def __init__(self, bg_img, bg_mask, fg_img, fg_mask):
        self.bg_img = np.array(bg_img, dtype="uint8")
        self.bg_mask = np.array(bg_mask, dtype="uint8")

        self.fg_img = np.array(fg_img, dtype="uint8")
        self.fg_mask = np.array(fg_mask, dtype="uint8")

    def run(self):
        return inference_single_image(self.fg_img, self.fg_mask, self.bg_img, self.bg_mask)